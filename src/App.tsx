import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import { Header } from './components/Header';
import { LanguageProvider } from './contexts/LanguageContext';
import { AuthProvider } from './contexts/AuthContext';
import { Hero } from './components/Hero';
import { Footer } from './components/Footer';

const NewsSection = lazy(() => import('./components/NewsSection').then(m => ({ default: m.NewsSection })));
const ManagementSection = lazy(() => import('./components/ManagementSection').then(m => ({ default: m.ManagementSection })));
const ProjectsSection = lazy(() => import('./components/ProjectsSection').then(m => ({ default: m.ProjectsSection })));
const ProjectsShowcase = lazy(() => import('./components/ProjectsShowcase').then(m => ({ default: m.ProjectsShowcase })));
const InitiativeBanner = lazy(() => import('./components/InitiativeBanner').then(m => ({ default: m.InitiativeBanner })));
const DevelopmentDecisionBanner = lazy(() => import('./components/DevelopmentDecisionBanner').then(m => ({ default: m.DevelopmentDecisionBanner })));
const CampusPage = lazy(() => import('./components/CampusPage').then(m => ({ default: m.CampusPage })));
const ServicesPage = lazy(() => import('./components/ServicesPage').then(m => ({ default: m.ServicesPage })));
const ProjectsPage = lazy(() => import('./components/ProjectsPage').then(m => ({ default: m.ProjectsPage })));
const ProfilePage = lazy(() => import('./components/ProfilePage').then(m => ({ default: m.ProfilePage })));
const SmartCityLayout = lazy(() => import('./components/SmartCityLayout').then(m => ({ default: m.SmartCityLayout })));
const AIChat = lazy(() => import('./components/AIChat').then(m => ({ default: m.AIChat })));
const EventsSection = lazy(() => import('./components/EventsSection').then(m => ({ default: m.EventsSection })));
const Login = lazy(() => import('./components/Login').then(m => ({ default: m.Login })));
const Register = lazy(() => import('./components/Register').then(m => ({ default: m.Register })));
const ForgotPassword = lazy(() =>
  import('./components/ForgotPassword').then(m => ({ default: m.ForgotPassword }))
);
const ResetPassword = lazy(() =>
  import('./components/ResetPassword').then(m => ({ default: m.ResetPassword }))
);

const SectionLoader: React.FC = () => (
  <div className="py-8 text-center text-sm text-gray-400 animate-pulse">Загрузка...</div>
);

const AUTH_PAGES = ['login', 'register', 'forgot-password', 'reset-password'] as const;

const AppContent: React.FC = () => {
  const { passwordRecoveryMode, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [isChatOpen, setIsChatOpen] = useState(false);


  useEffect(() => {
    const search = window.location.search;
    const hash = window.location.hash;
    
    // Проверяем все возможные варианты ссылки восстановления пароля от Supabase
    if (
      hash.includes('type=recovery') || 
      search.includes('type=recovery') ||
      hash.includes('access_token') && hash.includes('type=recovery')
    ) {
      setCurrentPage('reset-password');
    }
  }, []);

  useEffect(() => {
    if (passwordRecoveryMode) {
      setCurrentPage('reset-password');
    }
  }, [passwordRecoveryMode]);
  if (loading) {
    return (
      <div className="bg-[#0f2942] min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const navigate = (page: string) => {
    setCurrentPage(page);
    window.history.replaceState({}, '', '/');
    window.scrollTo(0, 0);
  };

  const handleSwitchToLogin = () => {
    setCurrentPage('login');
  };

  const handleSwitchToRegister = () => {
    setCurrentPage('register');
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'login':
        return (
          <Suspense fallback={<SectionLoader />}>
            <Login 
              onNavigate={navigate} 
              onSwitchToRegister={handleSwitchToRegister}
            />
          </Suspense>
        );
      case 'register':
        return (
          <Suspense fallback={<SectionLoader />}>
            <Register 
              onNavigate={navigate} 
              onSwitchToLogin={handleSwitchToLogin}
            />
          </Suspense>
        );
      case 'forgot-password':
        return (
          <Suspense fallback={<SectionLoader />}>
            <ForgotPassword onNavigate={navigate} />
          </Suspense>
        );
      case 'reset-password':
        return (
          <Suspense fallback={<SectionLoader />}>
            <ResetPassword onNavigate={navigate} />
          </Suspense>
        );
        case 'campus':
          return (
            <>
              <Hero onNavigate={navigate} currentPage={currentPage} />
              <Suspense fallback={<SectionLoader />}>
                <CampusPage onNavigate={navigate} /> {/* Убедитесь, что onNavigate проброшен сюда */}
              </Suspense>
            </>
          );
      case 'services':
        return (
          <>
            <Hero onNavigate={navigate} currentPage={currentPage} />
            <Suspense fallback={<SectionLoader />}>
              <ServicesPage />
            </Suspense>
          </>
        );
      case 'projects':
        return (
          <>
            <Hero onNavigate={navigate} currentPage={currentPage} />
            <Suspense fallback={<SectionLoader />}>
              <ProjectsPage onNavigate={navigate} />
            </Suspense>
          </>
        );
      case 'profile':
      case 'newPage':
        return (
          <Suspense fallback={<SectionLoader />}>
            <ProfilePage onNavigate={navigate} />
          </Suspense>
        );

      case 'management':
        return (
          <>
            <Hero onNavigate={navigate} currentPage={currentPage} />
            <Suspense fallback={<SectionLoader />}>
              <SmartCityLayout />
            </Suspense>
          </>
        );

      case 'all-news':
        return (
          <>
            <Hero onNavigate={navigate} currentPage="home" />
            <main>
              <Suspense fallback={<SectionLoader />}>
                <NewsSection isFullPage={true} onNavigate={navigate} />
              </Suspense>
            </main>
          </>
        );

      case 'home':
      default:
        return (
          <>
            <Hero onNavigate={navigate} currentPage={currentPage} />
            <main>
              <Suspense fallback={<SectionLoader />}>
                {/* 1. Новости города */}
                <NewsSection isFullPage={false} limit={4} onNavigate={navigate} />
                
                {/* 2. Стратегический баннер */}
                <DevelopmentDecisionBanner />

                {/* 3. Цифровые сервисы (из базы Supabase) */}
                <div className="mt-12">
                   <ServicesPage hideHeader={true} /> 
                </div>

                                
                {/* 5. Управление и Проекты */}
                <ManagementSection />
                <ProjectsSection onNavigate={navigate} />
                <InitiativeBanner />
              </Suspense>
            </main>
          </>
        );
    }
  };

  return (
    <div className="bg-[#063553] text-white min-h-screen selection:bg-yellow-400 selection:text-black transition-colors duration-500">
      {!AUTH_PAGES.includes(currentPage as (typeof AUTH_PAGES)[number]) && (
        <div className="page-container">
          <Header 
            onNavigate={navigate} 
            onOpenChat={() => setIsChatOpen(true)} 
          />
        </div>
      )}
      
      {!AUTH_PAGES.includes(currentPage as (typeof AUTH_PAGES)[number]) && (
        <div className="page-container">
          {renderContent()}
        </div>
      )}

      {AUTH_PAGES.includes(currentPage as (typeof AUTH_PAGES)[number]) && renderContent()}

      {isChatOpen && (
        <Suspense fallback={null}>
          <AIChat 
            isOpen={isChatOpen} 
            onClose={() => setIsChatOpen(false)} 
          />
        </Suspense>
      )}

      {!AUTH_PAGES.includes(currentPage as (typeof AUTH_PAGES)[number]) && (
        <div className="w-full mt-20">
          <Footer />
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </LanguageProvider>
  );
};

export default App;