# CivicSpot - Smart City Issue Reporting Platform

A comprehensive platform for citizens to report civic issues, participate in community cleanup campaigns, and engage with local government.

## Features

- **Issue Reporting**: Report civic issues with photos and location data
- **Campaign Management**: Create and join community cleanup campaigns
- **Admin Dashboard**: Comprehensive admin panel for managing reports and users
- **Reward System**: Points-based gamification for user engagement
- **Real-time Notifications**: Stay updated on report status and campaigns
- **Interactive Maps**: Visualize issues and campaigns on interactive maps

## Tech Stack

### Backend
- Node.js with Express.js
- MongoDB with Mongoose
- JWT Authentication
- Cloudinary for image storage
- Multer for file uploads

### Frontend
- React 18 with Vite
- React Router for navigation
- Tailwind CSS for styling
- Mapbox GL for maps
- Axios for API calls
- Framer Motion for animations

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB Atlas account
- Cloudinary account
- Mapbox account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd civicspot
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Environment Setup**
   
   Backend (.env):
   ```
   PORT=5000
   MONGODB_URI=your_mongodb_connection_string
   JWT_SECRET=your_jwt_secret
   CLOUDINARY_CLOUD_NAME=your_cloudinary_name
   CLOUDINARY_API_KEY=your_cloudinary_key
   CLOUDINARY_API_SECRET=your_cloudinary_secret
   NODE_ENV=development
   ```
   
   Frontend (.env):
   ```
   VITE_MAPBOX_TOKEN=your_mapbox_token
   VITE_API_URL=http://localhost:5000
   ```

4. **Start Development Servers**
   ```bash
   npm run dev
   ```
   
   Or use the Windows batch file:
   ```bash
   start-dev.bat
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Reports
- `GET /api/reports` - Get all approved reports
- `POST /api/reports` - Create new report
- `GET /api/reports/my-reports` - Get user's reports

### Campaigns
- `GET /api/campaigns` - Get all campaigns
- `POST /api/campaigns` - Create new campaign
- `POST /api/campaigns/:id/join` - Join campaign

### Admin
- `GET /api/admin/stats` - Dashboard statistics
- `GET /api/admin/reports` - Admin reports management
- `PATCH /api/admin/reports/:id/status` - Update report status

## Deployment

### Backend (Railway)
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Frontend (Vercel)
1. Connect your GitHub repository to Vercel
2. Set build command: `cd frontend && npm run build`
3. Set output directory: `frontend/dist`
4. Deploy automatically on push

## Project Structure

```
civicspot/
├── backend/
│   ├── config/          # Configuration files
│   ├── middleware/      # Express middleware
│   ├── models/          # MongoDB models
│   ├── routes/          # API routes
│   ├── utils/           # Utility functions
│   └── server.js        # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable components
│   │   ├── context/     # React context
│   │   ├── pages/       # Page components
│   │   └── utils/       # Utility functions
│   └── public/          # Static assets
└── package.json         # Root package.json
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details