# AirAlert 🌬️

## AI-powered Early Warning System for Air Pollution

AirAlert is an intelligent air quality monitoring and alert system that combines real-time air quality data, AI-driven predictions, and personalized notifications to help communities and individuals stay informed about air pollution risks.

## Features

- 📊 **Real-time Air Quality Monitoring**: Integration with OpenAQ, Sentinel-5P, and MODIS data sources for comprehensive air quality information
- 🌐 **Interactive Maps**: Visualize air pollution data with dynamic maps showing pollution hotspots and affected areas
- 📱 **Personalized Alerts**: Receive customized alerts based on location, sensitivity profile, and air quality thresholds
- 🤖 **LLM-Powered Insights**: Leverages OpenAI models to generate natural language alerts and recommendations
- 📈 **Predictive Analysis**: Forecast pollution patterns using AI-driven models
- 🌡️ **Weather Correlation**: Integrate weather data to analyze correlations with pollution levels

## Technology Stack

### Backend

- **Python 3.12+**
- **FastAPI**: High-performance API framework
- **SQLAlchemy**: ORM for database interactions
- **GeoAlchemy2**: Spatial data handling
- **Alembic**: Database migrations
- **OpenAI API**: For LLM-powered alert generation
- **aiohttp**: Asynchronous HTTP client
- **geopandas**: Geospatial data processing

### Frontend

- **React 19**: User interface framework
- **Leaflet/React-Leaflet**: Interactive maps
- **Recharts**: Data visualization
- **Axios**: HTTP client
- **TypeScript**: For type-safe code
- **Material-UI**: Component library for responsive design
- **Redux Toolkit**: State management
- **React Router**: Navigation management

### Data Storage

- **SQLite**: Development database
- **PostgreSQL**: Production database (supports spatial extensions)

## Project Structure

```
airalert/
├── backend/                # Backend Python application
│   ├── alerts/             # Alert generation and management
│   ├── api/                # FastAPI application and routes
│   ├── data_acquisition/   # Data fetchers (OpenAQ, Sentinel-5P, etc.)
│   ├── gis_processing/     # Geospatial data processing
│   ├── models/             # Database models
│   └── notifications/      # Notification delivery system
├── frontend/               # React frontend application
│   ├── public/             # Static assets
│   └── src/                # React components and logic
├── migrations/             # Alembic database migrations
├── data/                   # Data storage directory
├── docs/                   # Documentation
├── papers/                 # Research papers and references
├── .env                    # Environment configuration
├── .env.sample             # Sample environment configuration
├── alembic.ini             # Alembic configuration
├── requirements.txt        # Python dependencies
├── main.py                 # Application entry point
└── docker-compose.yml      # Docker Compose configuration
```

## Installation

### Prerequisites

- Python 3.12+
- Node.js 16+
- PostgreSQL with PostGIS (optional for production)
- Docker and Docker Compose (for containerized deployment)

### Development Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/Swayam2004/AirAlert.git
   cd airalert
   ```

2. **Create and activate a virtual environment**

   Depending on your operating system and shell, use one of the following commands:

   | Platform | Shell      | Command to activate virtual environment |
   | -------- | ---------- | --------------------------------------- |
   | POSIX    | bash/zsh   | `$ source venv/bin/activate`            |
   | POSIX    | fish       | `$ source venv/bin/activate.fish`       |
   | POSIX    | csh/tcsh   | `$ source venv/bin/activate.csh`        |
   | POSIX    | pwsh       | `$ venv/bin/Activate.ps1`               |
   | Windows  | cmd.exe    | `C:\> venv\Scripts\activate.bat`        |
   | Windows  | PowerShell | `PS C:\> venv\Scripts\Activate.ps1`     |

3. **Install Python dependencies**

   ```bash
   pip install -r requirements.txt
   ```

4. **Setup environment variables**

   ```bash
   cp .env.sample .env
   # Edit .env with your configuration
   ```

5. **Setup the database**

   ```bash
   alembic upgrade head
   ```

6. **Install frontend dependencies**

   ```bash
   cd frontend
   npm install
   cd ..
   ```

### Running the Application

1. **Start the backend server**

   ```bash
   python main.py
   ```

   The API will be available at http://localhost:8000

2. **Start the frontend development server**

   ```bash
   cd frontend
   npm start
   ```

   The frontend will be available at http://localhost:3000

## Docker Deployment

1. **Build and start the containers**

   ```bash
   docker-compose up -d
   ```

   This will start:

   - Backend API on port 8000
   - Frontend on port 3000
   - PostgreSQL database on port 5432

2. **Initialize the database (first time only)**

   ```bash
   docker-compose exec backend alembic upgrade head
   ```

3. **Stop the containers**

   ```bash
   docker-compose down
   ```

## Configuration (.env)

| Variable              | Description                         | Default                           |
| --------------------- | ----------------------------------- | --------------------------------- |
| `HOST`                | Host to bind the server             | 0.0.0.0                           |
| `PORT`                | Port for the server                 | 8000                              |
| `DEBUG`               | Enable debug mode                   | False                             |
| `DATABASE_URL`        | Database connection URL             | sqlite+aiosqlite:///./airalert.db |
| `OPENAI_API_KEY`      | OpenAI API key                      | -                                 |
| `OPENAQ_API_KEY`      | OpenAQ API key                      | -                                 |
| `MAPBOX_ACCESS_TOKEN` | Mapbox token                        | -                                 |
| `LLM_MODEL`           | OpenAI model to use                 | gpt-4o                            |
| `GIS_OUTPUT_DIR`      | Directory for GIS outputs           | output                            |
| `CELL_SIZE`           | Cell size for spatial interpolation | 0.01                              |
| `ALERT_EXPIRY_HOURS`  | Hours until alerts expire           | 6                                 |
| `DEFAULT_COUNTRY`     | Default country to fetch data for   | IN                                |
| `EMAIL_HOST`          | SMTP host                           | smtp.gmail.com                    |
| `EMAIL_PORT`          | SMTP port                           | 587                               |
| `EMAIL_USERNAME`      | SMTP username                       | -                                 |
| `EMAIL_PASSWORD`      | SMTP password                       | -                                 |

## API Documentation

### Authentication Endpoints

| Method | Endpoint        | Description           |
| ------ | --------------- | --------------------- |
| POST   | `/api/register` | Register a new user   |
| POST   | `/api/token`    | Get an access token   |
| GET    | `/api/users/me` | Get current user info |

### Air Quality Data Endpoints

| Method | Endpoint                   | Description                          |
| ------ | -------------------------- | ------------------------------------ |
| GET    | `/api/monitoring_stations` | Get list of monitoring stations      |
| GET    | `/api/air_quality`         | Get air quality readings             |
| POST   | `/api/fetch_data`          | Trigger data collection from sources |

### Alert Management Endpoints

| Method | Endpoint                       | Description                     |
| ------ | ------------------------------ | ------------------------------- |
| POST   | `/api/check_alerts`            | Check for threshold exceedances |
| GET    | `/api/alerts`                  | Get active alerts               |
| GET    | `/api/notifications/{user_id}` | Get user notifications          |

### System Endpoints

| Method | Endpoint   | Description              |
| ------ | ---------- | ------------------------ |
| GET    | `/health`  | Health check endpoint    |
| GET    | `/api/map` | Get interactive map data |

## Data Sources

### OpenAQ

AirAlert integrates with the [OpenAQ API](https://openaq.org/) to fetch global air quality data from government sensors. The system retrieves:

- Station metadata (location, name, etc.)
- Pollutant readings (PM2.5, PM10, O3, NO2, SO2, CO)

### Sentinel-5P

The [Sentinel-5P satellite](https://sentinel.esa.int/web/sentinel/missions/sentinel-5p) provides atmospheric data for:

- NO2, SO2, O3, CO concentrations
- CH4 (methane) levels
- Aerosol index

### Weather Data

Weather information is integrated from:

- NOAA for global weather data
- IMD (Indian Meteorological Department) for Indian weather data

## Alert System

AirAlert's alert system works as follows:

1. **Data Collection**: Regular fetching of air quality data from multiple sources
2. **Threshold Analysis**: Identification of areas exceeding safe pollution levels
3. **Alert Generation**: Creation of alerts with severity levels and affected areas
4. **Message Customization**: LLM-powered generation of personalized alert messages
5. **Notification Delivery**: Multi-channel alert delivery (app, email, SMS)

Alert severity is determined based on established health guidelines for each pollutant.

## Troubleshooting

### Common Issues

#### API Connection Problems

```bash
# Check if the API server is running
curl http://localhost:8000/health

# Verify environment variables
cat .env | grep API
```

#### Database Migration Errors

```bash
# Reset migrations
alembic revision --autogenerate -m "reset"
alembic upgrade head
```

#### Frontend Build Issues

```bash
# Clean npm cache
npm cache clean --force
npm install --legacy-peer-deps
```

## Security

AirAlert implements several security measures:

- JWT-based authentication
- Password hashing with bcrypt
- Input validation and sanitization
- HTTPS-only API communications
- Rate limiting for API endpoints

## Acknowledgements

- [OpenAQ](https://openaq.org/) for air quality data
- [European Space Agency](https://www.esa.int/) for Sentinel-5P data
- Research from VayuBuddy and similar air quality monitoring systems

<div align="center">Made with ❤️ by the <b>AirAlert Team</b></div>
