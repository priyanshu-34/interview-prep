import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ActivityProvider } from './contexts/ActivityContext';
import { BookmarkProvider } from './contexts/BookmarkContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TrackProvider } from './contexts/TrackContext';
import { QuestionsProvider } from './contexts/QuestionsContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { TopicDetail } from './pages/TopicDetail';
import { Cumulative } from './pages/Cumulative';
import { Bookmarks } from './pages/Bookmarks';
import { Revise } from './pages/Revise';
import { PickOne } from './pages/PickOne';
import { MockInterview } from './pages/MockInterview';
import { Notes } from './pages/Notes';
import { Analytics } from './pages/Analytics';
import { Admin } from './pages/Admin';
import { QuestionDetail } from './pages/QuestionDetail';
import { useAuth } from './contexts/AuthContext';
import { isAdmin } from './lib/admin';

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user || !isAdmin(user.email ?? undefined)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ActivityProvider>
            <BookmarkProvider>
              <TrackProvider>
                <QuestionsProvider>
                  <Routes>
                    <Route path="/" element={<Layout />}>
                      <Route index element={<Dashboard />} />
                      <Route path="topic/:topicId" element={<TopicDetail />} />
                      <Route path="question/:questionId" element={<QuestionDetail />} />
                      <Route path="cumulative" element={<Cumulative />} />
                      <Route path="bookmarks" element={<Bookmarks />} />
                      <Route path="revise" element={<Revise />} />
                      <Route path="pick-one" element={<PickOne />} />
                      <Route path="mock" element={<MockInterview />} />
                      <Route path="notes" element={<Notes />} />
                      <Route path="analytics" element={<Analytics />} />
                      <Route path="admin" element={<AdminGuard><Admin /></AdminGuard>} />
                    </Route>
                  </Routes>
                </QuestionsProvider>
              </TrackProvider>
            </BookmarkProvider>
          </ActivityProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
