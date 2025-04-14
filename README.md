# WrenchTrack

A modern web application for tracking and managing mechanical service records. WrenchTrack helps mechanics and vehicle owners maintain detailed service histories, schedule maintenance, and track repairs efficiently.

## Features

- User Authentication & Authorization
  - Secure login and registration
  - Role-based access control
  - JWT token authentication
- Vehicle Management
  - Add and manage multiple vehicles
  - Track vehicle details and history
  - Store important documents and photos
- Service Records
  - Create detailed service entries
  - Track parts and labor costs
  - Maintain service history
- Maintenance Scheduling
  - Set service reminders
  - Automated maintenance notifications
  - Service interval tracking
- Reporting & Analytics
  - Cost analysis reports
  - Service history exports
  - Maintenance predictions

## Technologies Used

- Frontend
  - React 18
  - Vite
  - TailwindCSS
  - React Router v6
  - React Query
  - Axios
- Backend
  - Node.js
  - Express
  - MongoDB
  - JWT Authentication
- Testing
  - Jest
  - React Testing Library
- DevOps
  - Docker
  - GitHub Actions

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or Atlas connection)

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/wrenchtrack.git
cd wrenchtrack_vite_final
```

2. Install dependencies
```bash
npm install
```

3. Configure environment variables
```bash
cp .env.example .env
# Edit .env with your configurations
```

4. Start the development server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Project Structure

```
wrenchtrack_vite_final/
├── src/
│   ├── components/         # Reusable UI components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── services/          # API services
│   ├── utils/             # Utility functions
│   ├── context/           # React context providers
│   ├── styles/            # Global styles
│   └── types/             # TypeScript definitions
├── public/                # Static assets
├── tests/                 # Test files
└── docs/                  # Documentation
```

## API Documentation

API documentation is available at `/api-docs` when running the development server.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run format` - Format code

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Michael - michael@wrenchtrack.com
Project Link: https://github.com/yourusername/wrenchtrack

## Acknowledgments

- [React Documentation](https://react.dev)
- [Vite](https://vitejs.dev)
- [TailwindCSS](https://tailwindcss.com)
- [MongoDB](https://www.mongodb.com)
