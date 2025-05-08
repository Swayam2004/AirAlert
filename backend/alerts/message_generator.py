"""
LLM-powered alert message generator for AirAlert.
Generates personalized natural language alerts based on air quality data.
"""
import os
import asyncio
import logging
from typing import Dict, List, Any, Optional, Tuple
import json
from datetime import datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from openai import AsyncOpenAI

from ..models.alerts import Alert, Notification
from ..models.users import User

class LLMAlertGenerator:
    """Generates personalized alert messages using LLM"""
    
    def __init__(self, db_session: AsyncSession, config: Dict[str, Any]):
        """
        Initialize with database session and configuration.
        
        Args:
            db_session: SQLAlchemy async session
            config: Configuration dictionary with API keys and settings
        """
        self.db_session = db_session
        self.config = config
        
        # Initialize OpenAI client
        self.client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY", config.get("openai_api_key")))
        self.model = config.get("llm_model", "gpt-4o")
        self.logger = logging.getLogger("LLMAlertGenerator")
        
        # Load message templates
        self.templates = config.get('message_templates', {
            'default_alert': 'Air quality alert: {pollutant} levels are {severity} in your area. Current value: {current_value}. Stay informed and take necessary precautions.'
        })
        
        # Health recommendation templates
        self.health_recommendations = {
            'general': [
                "Stay informed about air quality conditions.",
                "Keep windows and doors closed when air quality is poor.",
                "Use air purifiers indoors if available."
            ],
            'moderate': [
                "Consider limiting prolonged outdoor activities.",
                "Keep indoor air clean using air purifiers if available."
            ],
            'unhealthy_sensitive': [
                "Sensitive groups should reduce outdoor activities.",
                "Consider wearing an N95 mask outdoors if you belong to a vulnerable group.",
                "Keep medications handy if you have respiratory conditions."
            ],
            'unhealthy': [
                "Everyone should reduce outdoor exertion.",
                "Sensitive groups should avoid outdoor activities.",
                "Consider using air purifiers indoors.",
                "Keep windows and doors closed."
            ],
            'very_unhealthy': [
                "Everyone should avoid outdoor activities.",
                "Wear N95 masks if you must go outside.",
                "Stay indoors with windows closed and air purifiers running.",
                "Consider temporarily relocating if conditions persist and you have respiratory issues."
            ],
            'hazardous': [
                "Everyone should stay indoors.",
                "Wear N95 masks if you must go outside.",
                "Activate community emergency response if available.",
                "Consider evacuation if advised by authorities.",
                "Use air purifiers and keep all windows and doors sealed."
            ]
        }
    
    async def generate_alert_messages(self) -> int:
        """
        Generate messages for all pending notifications.
        
        Returns:
            Number of messages generated
        """
        # Find notifications without messages
        notification_stmt = select(Notification, Alert, User).\
            join(Alert, Notification.alert_id == Alert.id).\
            join(User, Notification.user_id == User.id).\
            where(Notification.message == "")
            
        result = await self.db_session.execute(notification_stmt)
        pending = result.all()
        
        self.logger.info(f"Found {len(pending)} pending notifications to generate")
        
        # Process each notification
        message_count = 0
        for notification, alert, user in pending:
            try:
                # Generate personalized message
                message = await self._generate_message(alert, user, notification.location_type)
                
                # Update notification with message
                stmt = update(Notification).\
                    where(Notification.id == notification.id).\
                    values(message=message)
                
                await self.db_session.execute(stmt)
                self.logger.info(f"Generated message for notification {notification.id}")
                message_count += 1
                
            except Exception as e:
                self.logger.error(f"Error generating message for notification {notification.id}: {str(e)}")
        
        # Commit all changes
        await self.db_session.commit()
        return message_count
    
    async def _generate_message(self, alert: Alert, user: User, location_type: str = 'home') -> str:
        """
        Generate personalized alert message using LLM.
        
        Args:
            alert: Alert object with pollution information
            user: UserProfile object for the recipient
            location_type: 'home' or 'work' to personalize message
            
        Returns:
            Personalized alert message
        """
        # Get template for this alert type
        template = self.templates.get(alert.message_template, "default_alert")
        
        # Map severity level to text
        severity_text = {
            5: "hazardous",
            4: "very unhealthy",
            3: "unhealthy",
            2: "unhealthy for sensitive groups",
            1: "moderate",
            0: "good"
        }.get(alert.severity_level, "concerning")
        
        # Map sensitivity level to text
        sensitivity_text = {
            0: "normal",
            1: "sensitive",
            2: "highly sensitive"
        }.get(user.sensitivity_level, "normal")
        
        # Prepare context for LLM
        context = {
            "alert_type": alert.alert_type,
            "severity_level": alert.severity_level,
            "severity_text": severity_text,
            "pollutant": alert.pollutant,
            "threshold_value": alert.threshold_value,
            "current_value": alert.current_value,
            "user_name": user.name or "Resident",
            "user_sensitivity": sensitivity_text,
            "location_type": location_type,
            "time_of_day": self._get_time_of_day()
        }
        
        # Get appropriate health recommendations based on severity
        recommendations = []
        
        if alert.severity_level >= 5:
            recommendations.extend(self.health_recommendations.get('hazardous', []))
        elif alert.severity_level >= 4:
            recommendations.extend(self.health_recommendations.get('very_unhealthy', []))
        elif alert.severity_level >= 3:
            recommendations.extend(self.health_recommendations.get('unhealthy', []))
        elif alert.severity_level >= 2:
            recommendations.extend(self.health_recommendations.get('unhealthy_sensitive', []))
        elif alert.severity_level >= 1:
            recommendations.extend(self.health_recommendations.get('moderate', []))
        else:
            recommendations.extend(self.health_recommendations.get('general', []))
        
        # Add user sensitivity specific recommendations
        if user.sensitivity_level >= 1 and alert.severity_level >= 1:
            recommendations.append("Keep medications accessible if you have respiratory conditions.")
            
        if user.sensitivity_level >= 2 and alert.severity_level >= 1:
            recommendations.append("Consider using air purifiers even at moderate pollution levels.")
            recommendations.append("Consult with healthcare provider about additional precautions.")
        
        # Prepare the prompt for the LLM
        prompt = f"""
        Generate a personalized air pollution alert message based on the following information:
        
        Alert Information:
        - Pollutant: {context['pollutant']}
        - Current Value: {context['current_value']}
        - Threshold Value: {context['threshold_value']}
        - Severity: {context['severity_text']} (level {context['severity_level']} on 0-5 scale)
        
        User Information:
        - Name: {context['user_name']}
        - Sensitivity to Air Pollution: {context['user_sensitivity']}
        - Location Affected: {context['location_type']} area
        - Time of Day: {context['time_of_day']}
        
        Health Recommendations (include 1-2 appropriate ones):
        {json.dumps(recommendations)}
        
        Generate a concise, clear alert message (60-80 words) that:
        - Starts with a clear indication of the air quality issue
        - Specifies the affected area (the user's {location_type})
        - Provides 1-2 specific health recommendations based on severity and user sensitivity
        - Includes a timeframe for the alert (next 6 hours)
        - Uses simple language accessible to general public
        - Avoids being alarmist while effectively communicating risk
        """
        
        try:
            # Call the LLM API
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are an air quality alert system that generates clear, concise, and personalized alerts."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=200,
                temperature=0.7
            )
            
            # Extract and return the generated message
            message = response.choices[0].message.content.strip()
            return message
        except Exception as e:
            self.logger.error(f"Error calling LLM API: {str(e)}")
            
            # Fallback to template-based message if LLM fails
            fallback_message = template.format(
                pollutant=alert.pollutant,
                severity=severity_text,
                current_value=alert.current_value,
                location=location_type
            )
            
            return fallback_message
    
    def _get_time_of_day(self) -> str:
        """Get current time of day category"""
        hour = datetime.now().hour
        if 5 <= hour < 12:
            return "morning"
        elif 12 <= hour < 17:
            return "afternoon"
        elif 17 <= hour < 22:
            return "evening"
        else:
            return "night"
