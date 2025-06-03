# Project Requirements Document (PRD)

## AirAlert 🌬️ - AI-powered Early Warning System for Air Pollution

**Version:** 1.0  
**Date:** June 4, 2025  
**Status:** Active Development

---

## 1. Project Overview

**Project Name:** AirAlert 🌬️  
**Tagline:** AI-powered Early Warning System for Air Pollution

AirAlert is an intelligent, full-stack air quality monitoring and alert system that combines real-time data acquisition from multiple sources, AI-driven predictive analytics, and personalized notification delivery to help communities and individuals stay informed about air pollution risks. The system leverages modern web technologies, geospatial processing, and machine learning to provide actionable insights and early warnings for air quality deterioration.

**Target Users:**

- General public seeking air quality information
- Health-conscious individuals with respiratory sensitivities
- Environmental researchers and scientists
- Government agencies and policy makers
- Urban planners and city administrators

---

## 2. Problem Statement

Air pollution poses a significant threat to public health globally, contributing to respiratory diseases, cardiovascular problems, and premature deaths. Current limitations include:

- **Fragmented Data Sources:** Air quality information is scattered across multiple APIs and databases
- **Lack of Personalization:** Generic alerts that don't account for individual health profiles or sensitivity levels
- **Poor Predictive Capabilities:** Most systems provide only current readings without forecasting
- **Limited Accessibility:** Technical barriers prevent non-experts from understanding air quality data
- **Delayed Warnings:** Reactive rather than proactive alert systems

**Vision:** AirAlert addresses these challenges by providing a unified, intelligent platform that aggregates multi-source data, applies AI-powered analysis, and delivers personalized, actionable alerts through multiple channels.

---

## 3. Features

### 3.1 Core Features (Complete)

| Feature                        | Description                                                   | Status      | Dependencies                        |
| ------------------------------ | ------------------------------------------------------------- | ----------- | ----------------------------------- |
| **Real-time Data Acquisition** | Integration with OpenAQ, Sentinel-5P, MODIS, and weather APIs | ✅ Complete | OpenAQ API, Satellite data services |
| **Interactive Dashboard**      | React-based user interface with real-time data visualization  | ✅ Complete | React 19, Recharts, Leaflet         |
| **User Authentication**        | JWT-based secure login/registration with role management      | ✅ Complete | FastAPI, SQLAlchemy                 |
| **Database Management**        | PostgreSQL/SQLite with spatial extensions                     | ✅ Complete | GeoAlchemy2, Alembic                |
| **RESTful API**                | FastAPI-powered backend with comprehensive endpoints          | ✅ Complete | FastAPI, Pydantic                   |

### 3.2 Advanced Features (Complete)

| Feature                         | Description                                              | Status      | Dependencies                         |
| ------------------------------- | -------------------------------------------------------- | ----------- | ------------------------------------ |
| **LLM-Powered Insights**        | OpenAI integration for natural language alert generation | ✅ Complete | OpenAI API (GPT-4o)                  |
| **Geospatial Processing**       | GIS-based interpolation and threshold analysis           | ✅ Complete | GeoPandas, GeoAlchemy2               |
| **Predictive Analytics**        | AI-driven pollution forecasting                          | ✅ Complete | Machine learning models              |
| **Weather Correlation**         | Analysis of weather impact on air quality                | ✅ Complete | Weather APIs, correlation algorithms |
| **Multi-channel Notifications** | Email, web push, and in-app notifications                | ✅ Complete | SMTP, Web Push API                   |

### 3.3 User Interface Features (Complete)

| Feature                           | Description                                       | Status      | Dependencies              |
| --------------------------------- | ------------------------------------------------- | ----------- | ------------------------- |
| **Advanced Monitoring Dashboard** | Multi-parameter visualization with heatmaps       | ✅ Complete | React-Leaflet, Chart.js   |
| **Data Explorer**                 | Interactive data analysis and visualization tools | ✅ Complete | Chart.js, React           |
| **Admin Panel**                   | User management and system administration         | ✅ Complete | Role-based access control |
| **API Documentation**             | Comprehensive API reference with examples         | ✅ Complete | Interactive documentation |
| **Mobile-Responsive Design**      | Adaptive UI for all device sizes                  | ✅ Complete | CSS Grid, Flexbox         |

### 3.4 Planned Enhancements

| Feature                     | Description                         | Status     | Dependencies        |
| --------------------------- | ----------------------------------- | ---------- | ------------------- |
| **Mobile Application**      | Native iOS/Android apps             | 📋 Planned | React Native, Expo  |
| **Edge Sensor Integration** | Support for IoT air quality sensors | 📋 Planned | MQTT, IoT protocols |
| **Advanced ML Models**      | Enhanced prediction accuracy        | 📋 Planned | TensorFlow, PyTorch |
| **Multi-language Support**  | Internationalization                | 📋 Planned | i18n libraries      |
| **Offline Capabilities**    | PWA with offline data access        | 📋 Planned | Service Workers     |

---

## 4. System Architecture

### 4.1 High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Data Sources  │
│   (React 19)    │◄──►│   (FastAPI)     │◄──►│   - OpenAQ      │
│                 │    │                 │    │   - Sentinel-5P │
│   - Dashboard   │    │   - API Routes  │    │   - MODIS       │
│   - Data Viz    │    │   - Auth        │    │   - Weather APIs│
│   - User Mgmt   │    │   - Alerts      │    └─────────────────┘
│   - Admin       │    │   - Processing  │
└─────────────────┘    └─────────────────┘
                               │
                       ┌─────────────────┐    ┌─────────────────┐
                       │   Database      │    │   External APIs │
                       │   (PostgreSQL)  │    │   - OpenAI      │
                       │                 │    │   - Email SMTP  │
                       │   - Users       │    │   - Web Push    │
                       │   - Air Quality │    └─────────────────┘
                       │   - Alerts      │
                       │   - Stations    │
                       └─────────────────┘
```

### 4.2 Module Communication

1. **Data Acquisition Flow:**

   - Fetchers (OpenAQ, Sentinel-5P, Weather) → Data Integrator → Database
   - Background tasks triggered via API endpoints

2. **Alert Processing Flow:**

   - Threshold Analyzer → Alert Trigger → LLM Message Generator → Notification Manager

3. **User Interaction Flow:**
   - Frontend React App → FastAPI Routes → Database/External APIs → Response

---

## 5. Technology Stack

### 5.1 Backend Technologies

| Technology      | Version | Purpose               | Configuration              |
| --------------- | ------- | --------------------- | -------------------------- |
| **Python**      | 3.12+   | Core backend language | Primary runtime            |
| **FastAPI**     | Latest  | API framework         | High-performance async API |
| **SQLAlchemy**  | Latest  | ORM                   | Database abstraction       |
| **GeoAlchemy2** | Latest  | Spatial data handling | GIS extensions             |
| **Alembic**     | Latest  | Database migrations   | Schema versioning          |
| **aiohttp**     | Latest  | Async HTTP client     | External API calls         |
| **GeoPandas**   | Latest  | Geospatial processing | GIS operations             |
| **OpenAI**      | Latest  | LLM integration       | GPT-4o for insights        |

### 5.2 Frontend Technologies

| Technology        | Version | Purpose            | Configuration            |
| ----------------- | ------- | ------------------ | ------------------------ |
| **React**         | 19      | UI framework       | Modern React with hooks  |
| **TypeScript**    | Latest  | Type safety        | Enhanced development     |
| **React-Leaflet** | Latest  | Interactive maps   | Geospatial visualization |
| **Recharts**      | Latest  | Data visualization | Charts and graphs        |
| **Axios**         | Latest  | HTTP client        | API communication        |
| **React Router**  | Latest  | Navigation         | SPA routing              |
| **Redux Toolkit** | Latest  | State management   | Application state        |

### 5.3 Data Storage & Infrastructure

| Technology         | Version | Purpose                       | Configuration          |
| ------------------ | ------- | ----------------------------- | ---------------------- |
| **PostgreSQL**     | Latest  | Production database           | With PostGIS extension |
| **SQLite**         | Latest  | Development database          | Local development      |
| **Docker**         | Latest  | Containerization              | Development/deployment |
| **Docker Compose** | Latest  | Multi-container orchestration | Service coordination   |

### 5.4 External APIs & Services

| Service          | Purpose                    | API Version | Configuration        |
| ---------------- | -------------------------- | ----------- | -------------------- |
| **OpenAQ**       | Global air quality data    | v2          | RESTful API          |
| **Sentinel-5P**  | Satellite atmospheric data | ESA API     | Copernicus services  |
| **MODIS**        | NASA satellite data        | Latest      | Earth data           |
| **OpenAI**       | LLM for insights           | GPT-4o      | Text generation      |
| **Weather APIs** | Meteorological data        | Various     | Correlation analysis |

---

## 6. Data Flow

### 6.1 Data Ingestion Pipeline

```
External Sources → Fetchers → Data Integrator → Validation → Database Storage
     ↓              ↓           ↓               ↓            ↓
  OpenAQ         OpenAQ      Unified          Quality     Air Quality
  Sentinel-5P    Fetcher     Format           Checks      Tables
  Weather APIs   Weather     Transformation   Dedup       Weather Tables
  MODIS          Fetcher     Geospatial       Validation  Station Tables
```

### 6.2 Alert Generation Pipeline

```
Database → Threshold Analysis → Alert Trigger → LLM Processing → Notification Delivery
    ↓            ↓                   ↓              ↓                ↓
Air Quality   Compare with       Generate         OpenAI           Email/Push/Web
Readings      Safety Limits      Alert Records    Message Gen      Multi-channel
Weather Data  User Preferences   Severity Calc    Personalization  User Targeting
```

### 6.3 User Interface Data Flow

```
User Interaction → Frontend → API Request → Backend Processing → Database Query → Response
      ↓              ↓           ↓              ↓                   ↓            ↓
  Click/Input    React Comp   HTTP Request   Route Handler       SQL Query    JSON Data
  Form Submit    State Mgmt   Axios Call     Auth Check          GIS Proc     Visualization
  Navigation     UI Update    Headers        Validation          Aggregation  User Display
```

---

## 7. Alert System Logic

### 7.1 Threshold Configuration

| Pollutant | Good | Moderate  | Unhealthy for Sensitive | Unhealthy  | Very Unhealthy | Hazardous |
| --------- | ---- | --------- | ----------------------- | ---------- | -------------- | --------- |
| **PM2.5** | 0-12 | 12.1-35.4 | 35.5-55.4               | 55.5-150.4 | 150.5-250.4    | 250.5+    |
| **PM10**  | 0-54 | 55-154    | 155-254                 | 255-354    | 355-424        | 425+      |
| **O3**    | 0-54 | 55-70     | 71-85                   | 86-105     | 106-200        | 201+      |
| **NO2**   | 0-53 | 54-100    | 101-360                 | 361-649    | 650-1249       | 1250+     |

### 7.2 Alert Severity Levels

1. **Level 1 (Informational):** Normal conditions, routine updates
2. **Level 2 (Advisory):** Moderate pollution, sensitive groups advised
3. **Level 3 (Warning):** Unhealthy for sensitive groups
4. **Level 4 (Alert):** Unhealthy for general population
5. **Level 5 (Emergency):** Very unhealthy to hazardous conditions

### 7.3 LLM Integration Points

- **Message Generation:** OpenAI GPT-4o creates personalized alert messages
- **Health Recommendations:** Context-aware advice based on pollution levels
- **Data Insights:** Natural language summaries of trends and patterns
- **Correlation Analysis:** AI-powered explanations of weather-pollution relationships

### 7.4 Notification Targeting

- **User Preferences:** Channel selection (email, push, in-app)
- **Location-based:** Geographic proximity to pollution events
- **Health Profiles:** Sensitivity levels and health conditions
- **Subscription Management:** Alert type and frequency preferences

---

## 8. API Overview

### 8.1 Authentication Endpoints

| Method | Endpoint                    | Description            | Authentication |
| ------ | --------------------------- | ---------------------- | -------------- |
| POST   | `/api/register`             | Register new user      | None           |
| POST   | `/api/token`                | User login             | Basic Auth     |
| GET    | `/api/users/me`             | Get current user       | Bearer Token   |
| POST   | `/api/verify_email/{token}` | Email verification     | None           |
| POST   | `/api/password-reset`       | Password reset request | None           |

### 8.2 Air Quality Data Endpoints

| Method | Endpoint                   | Description              | Authentication |
| ------ | -------------------------- | ------------------------ | -------------- |
| GET    | `/api/monitoring_stations` | List monitoring stations | None           |
| GET    | `/api/air_quality`         | Get air quality readings | None           |
| POST   | `/api/fetch_data`          | Trigger data collection  | Bearer Token   |
| GET    | `/api/insights`            | LLM-powered insights     | Bearer Token   |
| GET    | `/api/predictions`         | Pollution forecasts      | Bearer Token   |

### 8.3 Alert Management Endpoints

| Method | Endpoint                       | Description            | Authentication |
| ------ | ------------------------------ | ---------------------- | -------------- |
| GET    | `/api/alerts`                  | Get active alerts      | Bearer Token   |
| POST   | `/api/check_alerts`            | Trigger alert analysis | Bearer Token   |
| GET    | `/api/notifications/{user_id}` | User notifications     | Bearer Token   |
| POST   | `/api/notifications/process`   | Process notifications  | Bearer Token   |

### 8.4 Processing & Analysis Endpoints

| Method | Endpoint                   | Description                   | Authentication |
| ------ | -------------------------- | ----------------------------- | -------------- |
| GET    | `/api/weather/correlation` | Weather-pollution correlation | Bearer Token   |
| POST   | `/api/generate_map`        | Create interpolation maps     | Bearer Token   |
| GET    | `/api/map`                 | Interactive map data          | None           |

### 8.5 User Management Endpoints

| Method | Endpoint                                   | Description           | Authentication |
| ------ | ------------------------------------------ | --------------------- | -------------- |
| GET    | `/api/users/{user_id}/preferences`         | User preferences      | Bearer Token   |
| PUT    | `/api/users/{user_id}/preferences`         | Update preferences    | Bearer Token   |
| POST   | `/api/users/{user_id}/alert_subscriptions` | Create subscription   | Bearer Token   |
| POST   | `/api/web-push/subscribe`                  | Web push subscription | Bearer Token   |

### 8.6 Admin Endpoints

| Method | Endpoint                          | Description            | Authentication |
| ------ | --------------------------------- | ---------------------- | -------------- |
| GET    | `/api/admin/users`                | List users             | Admin Token    |
| PUT    | `/api/admin/users/{user_id}/role` | Update user role       | Admin Token    |
| POST   | `/api/admin/broadcast`            | Send broadcast message | Admin Token    |
| GET    | `/api/admin/statistics`           | System statistics      | Admin Token    |

---

## 9. Configuration & Environment

### 9.1 Core Environment Variables

| Variable       | Description         | Default               | Required |
| -------------- | ------------------- | --------------------- | -------- |
| `HOST`         | Server host address | 127.0.0.1             | No       |
| `PORT`         | Server port         | 8000                  | No       |
| `DEBUG`        | Debug mode          | False                 | No       |
| `DATABASE_URL` | Database connection | sqlite:///airalert.db | No       |

### 9.2 API Keys & External Services

| Variable              | Description    | Default | Required |
| --------------------- | -------------- | ------- | -------- |
| `OPENAI_API_KEY`      | OpenAI API key | -       | Yes      |
| `OPENAQ_API_KEY`      | OpenAQ API key | -       | No       |
| `MAPBOX_ACCESS_TOKEN` | Mapbox token   | -       | No       |
| `LLM_MODEL`           | OpenAI model   | gpt-4o  | No       |

### 9.3 GIS & Processing Configuration

| Variable          | Description                     | Default | Required |
| ----------------- | ------------------------------- | ------- | -------- |
| `GIS_OUTPUT_DIR`  | GIS output directory            | output  | No       |
| `CELL_SIZE`       | Spatial interpolation cell size | 0.01    | No       |
| `DEFAULT_COUNTRY` | Default country code            | IN      | No       |

### 9.4 Alert System Configuration

| Variable             | Description           | Default | Required |
| -------------------- | --------------------- | ------- | -------- |
| `ALERT_EXPIRY_HOURS` | Alert expiration time | 6       | No       |
| `DEFAULT_RADIUS_KM`  | Default alert radius  | 25      | No       |

### 9.5 Notification Configuration

| Variable            | Description          | Default        | Required        |
| ------------------- | -------------------- | -------------- | --------------- |
| `EMAIL_HOST`        | SMTP host            | smtp.gmail.com | No              |
| `EMAIL_PORT`        | SMTP port            | 587            | No              |
| `EMAIL_USERNAME`    | SMTP username        | -              | Yes (for email) |
| `EMAIL_PASSWORD`    | SMTP password        | -              | Yes (for email) |
| `VAPID_PUBLIC_KEY`  | Web push public key  | -              | Yes (for push)  |
| `VAPID_PRIVATE_KEY` | Web push private key | -              | Yes (for push)  |

### 9.6 JWT Configuration

| Variable                          | Description              | Default        | Required |
| --------------------------------- | ------------------------ | -------------- | -------- |
| `JWT_SECRET_KEY`                  | JWT signing key          | supersecretkey | Yes      |
| `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiration         | 30             | No       |
| `JWT_REFRESH_TOKEN_EXPIRE_DAYS`   | Refresh token expiration | 7              | No       |

---

## 10. Installation & Setup

### 10.1 Prerequisites

- **Python 3.12+**
- **Node.js 16+**
- **PostgreSQL with PostGIS** (optional for production)
- **Docker and Docker Compose** (for containerized deployment)

### 10.2 Development Setup

#### Backend Setup

```bash
# Clone repository
git clone https://github.com/Swayam2004/AirAlert.git
cd airalert

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Setup environment
cp .env.sample .env
# Edit .env with your configuration

# Initialize database
alembic upgrade head

# Start backend server
python main.py
```

#### Frontend Setup

```bash
# Install frontend dependencies
cd frontend
npm install

# Start development server
npm start
```

### 10.3 Docker Deployment

```bash
# Build and start containers
docker-compose up -d

# Initialize database (first time)
docker-compose exec backend alembic upgrade head

# Stop containers
docker-compose down
```

### 10.4 Production Deployment

1. **Environment Configuration:** Set production environment variables
2. **Database Setup:** Configure PostgreSQL with PostGIS
3. **SSL/TLS:** Enable HTTPS for secure communications
4. **Load Balancing:** Configure reverse proxy (nginx)
5. **Monitoring:** Set up logging and health checks

---

## 11. Future Enhancements

### 11.1 Short-term Goals (6 months)

- **Mobile Application:** React Native app for iOS/Android
- **Enhanced ML Models:** Improved prediction accuracy with deep learning
- **Real-time Notifications:** WebSocket-based live updates
- **Satellite Data Expansion:** Additional satellite data sources
- **Performance Optimization:** Caching and query optimization

### 11.2 Medium-term Goals (12 months)

- **IoT Integration:** Support for personal air quality sensors
- **Multi-language Support:** Internationalization for global deployment
- **Advanced Analytics:** Machine learning insights for health impact
- **API Marketplace:** Public API for third-party developers
- **Edge Computing:** Distributed processing for faster response times

### 11.3 Long-term Vision (24+ months)

- **Global Expansion:** Worldwide air quality monitoring network
- **Predictive Health Modeling:** AI-powered health risk assessment
- **Policy Insights:** Data-driven recommendations for policymakers
- **Community Features:** Social sharing and collaborative monitoring
- **Climate Integration:** Correlation with climate change indicators

---

## 12. Security Measures

### 12.1 Authentication & Authorization

- **JWT-based Authentication:** Secure token-based access control
- **Role-based Access Control:** User, admin, and superuser roles
- **Password Security:** bcrypt hashing with salt
- **Token Management:** Access and refresh token rotation
- **Account Security:** Failed login protection and account locking

### 12.2 API Security

- **Input Validation:** Comprehensive request validation and sanitization
- **Rate Limiting:** API endpoint rate limiting to prevent abuse
- **CORS Configuration:** Proper cross-origin resource sharing setup
- **HTTPS Enforcement:** SSL/TLS encryption for all communications
- **SQL Injection Protection:** Parameterized queries with SQLAlchemy

### 12.3 Data Protection

- **Sensitive Data Encryption:** Environment variable protection
- **Database Security:** Connection encryption and access controls
- **Personal Information:** Privacy-compliant user data handling
- **API Key Management:** Secure external service authentication

### 12.4 Infrastructure Security

- **Container Security:** Docker best practices and minimal attack surface
- **Network Security:** Firewall configuration and network isolation
- **Monitoring & Logging:** Comprehensive audit trails and error tracking
- **Backup & Recovery:** Regular data backups and disaster recovery plans

---

## 13. Acknowledgements

### 13.1 Data Sources

- **[OpenAQ](https://openaq.org/):** Global air quality data from government sensors
- **[European Space Agency](https://www.esa.int/):** Sentinel-5P atmospheric satellite data
- **[NASA](https://nasa.gov/):** MODIS satellite environmental data
- **[NOAA](https://noaa.gov/):** Weather and atmospheric data

### 13.2 Research References

- **VayuBuddy:** LLM-powered chatbot for air quality insights
- **Autonomous GIS:** AI-powered geospatial information systems
- **WHO Air Quality Guidelines:** Health-based air quality standards
- **EPA Air Quality Index:** Standardized pollution measurement framework

### 13.3 Open Source Technologies

- **FastAPI:** High-performance Python web framework
- **React:** User interface library for modern web applications
- **PostgreSQL:** Advanced open-source relational database
- **Leaflet:** Open-source JavaScript library for interactive maps
- **OpenAI:** Advanced language models for AI-powered insights

---

**Document Status:** Living Document - Updated as project evolves  
**Next Review Date:** July 4, 2025  
**Maintainer:** AirAlert Development Team  
**Contact:** [GitHub Repository](https://github.com/Swayam2004/AirAlert)
