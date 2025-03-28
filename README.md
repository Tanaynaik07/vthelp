# VT Help

A platform for managing and organizing academic papers and notes for VT students.

## Features

- Paper Management
- Notes Management
- User Authentication
- Admin Panel
- Cloud Storage Integration

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express.js
- Database: MongoDB
- Cloud Storage: Cloudinary
- Authentication: Passport.js

## Setup Instructions

1. Clone the repository
```bash
git clone https://github.com/yourusername/vthelp.git
cd vthelp
```

2. Install dependencies
```bash
npm install
```

3. Create a `.env` file in the root directory with the following variables:
```
MONGODB_URI=your_mongodb_uri
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
SESSION_SECRET=your_session_secret
```

4. Run the development server
```bash
npm start
```

## Deployment

### Frontend (Vercel)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy

### Backend (Render)
1. Push your code to GitHub
2. Create a new Web Service in Render
3. Connect your repository
4. Configure environment variables
5. Deploy

## Environment Variables

Required environment variables for deployment:

- `MONGODB_URI`: MongoDB connection string
- `CLOUDINARY_CLOUD_NAME`: Cloudinary cloud name
- `CLOUDINARY_API_KEY`: Cloudinary API key
- `CLOUDINARY_API_SECRET`: Cloudinary API secret
- `SESSION_SECRET`: Session secret for authentication
- `PORT`: Port number (optional, defaults to 3000)

## License

MIT License #   v t h e l p  
 