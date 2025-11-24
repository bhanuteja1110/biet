# BIET College Management System

A comprehensive college management system built with React, TypeScript, and Firebase. This system provides role-based access control for students, teachers, and administrators with a modern, responsive interface.

## 🚀 Features

### For Students
- **Dashboard**: View attendance, assignments, and announcements
- **Attendance Tracking**: Monitor subject-wise attendance with visual charts
- **Assignments**: Submit assignments and track progress
- **Marks**: View grades and academic performance
- **Library**: Access library resources and books
- **Exams**: View exam schedules and results
- **Fees**: Track fee payments and generate receipts
- **Profile**: Manage personal information

### For Teachers
- **Teacher Dashboard**: Overview of classes and quick actions
- **Attendance Management**: Mark and track student attendance
- **Assignment Management**: Create and grade assignments
- **Marks Management**: Update student grades
- **Announcements**: Post important notices

### For Administrators
- **Admin Dashboard**: System overview and KPIs
- **Student Management**: Manage student profiles and data
- **Fee Management**: Handle fee collection and tracking
- **Transport Management**: Manage transport routes and schedules
- **Placement Management**: Track placement activities
- **System Settings**: Configure system-wide settings

## 🛠️ Technology Stack

- **Frontend**: React 19, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Charts**: Recharts
- **Animations**: Framer Motion
- **Icons**: Lucide React
- **Routing**: React Router DOM

## 🔧 Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Firebase project

### 1. Clone the Repository
```bash
git clone <repository-url>
cd Collage
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Firebase Configuration
The Firebase configuration is already set up in `src/firebase/firebase.ts` with the following project:
- **Project ID**: biet-16d1b
- **Domain**: biet-16d1b.firebaseapp.com

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 🔐 Authentication & Roles

### Role Assignment
Roles are automatically assigned based on email domains:
- **Student**: Default role for all users
- **Teacher**: Users with `@teacher.` or `@faculty.` in email
- **Admin**: Users with `@admin.` or `@biet.` in email

### Test Accounts
You can create accounts with different roles:
- **Student**: `student@example.com`
- **Teacher**: `teacher@example.com` or `faculty@example.com`
- **Admin**: `admin@biet.com` or `admin@example.com`

## 📱 Application Structure

```
src/
├── auth/                 # Authentication context and logic
├── components/           # Reusable UI components
│   └── layout/          # Layout components (AppShell)
├── firebase/            # Firebase configuration
├── pages/               # Page components
│   ├── auth/           # Authentication pages
│   ├── Dashboard.tsx   # Student dashboard
│   ├── TeacherDashboard.tsx
│   └── AdminDashboard.tsx
├── utils/               # Utility functions
│   ├── firestore.ts    # Firestore operations
│   ├── initDatabase.ts # Database initialization
│   └── testApp.ts      # Application testing
└── App.tsx             # Main application component
```

## 🚀 Performance Optimizations

- **Lazy Loading**: Components are loaded on demand
- **Data Caching**: User data is cached to reduce Firestore calls
- **Optimized Animations**: Reduced animations for better performance
- **Loading States**: Proper loading indicators for better UX
- **Code Splitting**: Automatic code splitting with React.lazy

## 🔒 Security Features

- **Role-based Access Control**: Users can only access pages appropriate to their role
- **Route Protection**: Protected routes redirect unauthorized users
- **Firebase Security**: All data operations go through Firebase security rules
- **Input Validation**: Form inputs are validated before submission

## 📊 Database Structure

### Collections
- **users**: User profiles and roles
- **announcements**: College announcements
- **assignments**: Assignment details and submissions
- **events**: College events and schedules
- **classes**: Class information and configurations
- **attendance**: Attendance records
- **marks**: Student grades and marks

## 🧪 Testing

Run the application tests:
```bash
# The test suite is included in src/utils/testApp.ts
# Tests cover:
# - Database initialization
# - Route accessibility
# - Role-based access control
# - Performance optimizations
```

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Firebase Hosting
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase hosting
firebase init hosting

# Deploy
firebase deploy
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Made with ❤️ by Students for Students**