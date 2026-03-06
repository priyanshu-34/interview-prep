import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TrackProvider } from './contexts/TrackContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { TopicDetail } from './pages/TopicDetail';
import { Cumulative } from './pages/Cumulative';
import { Bookmarks } from './pages/Bookmarks';
import { Notes } from './pages/Notes';
import { Analytics } from './pages/Analytics';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <TrackProvider>
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={<Dashboard />} />
                <Route path="topic/:topicId" element={<TopicDetail />} />
                <Route path="cumulative" element={<Cumulative />} />
                <Route path="bookmarks" element={<Bookmarks />} />
                <Route path="notes" element={<Notes />} />
                <Route path="analytics" element={<Analytics />} />
              </Route>
            </Routes>
          </TrackProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
