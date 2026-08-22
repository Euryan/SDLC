import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ChildProvider } from "./context/ChildContext";
import { AuthProvider } from "./context/AuthContext";
import HomePage from "./pages/HomePage";
import CoursePage from "./pages/CoursePage";
import CategoryPage from "./pages/CategoryPage";
import ModulePage from "./pages/ModulePage";
import LessonPage from "./pages/LessonPage";
import BeritaPage from "./pages/BeritaPage";
import ProgressPage from "./pages/ProgressPage";
import ProfilePage from "./pages/ProfilePage";
import SignInPage from "./pages/SignInPage";
import SignUpPage from "./pages/SignUpPage";
import ScreeningPage from "./pages/ScreeningPage";
import AdminPage from "./pages/AdminPage";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <ChildProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/course" element={<CoursePage />} />
              <Route path="/course/:categoryId" element={<CategoryPage />} />
              <Route path="/course/:categoryId/:courseId" element={<ModulePage />} />
              <Route path="/lesson" element={<LessonPage />} />
              <Route path="/lesson/:categoryId" element={<LessonPage />} />
              <Route path="/lesson/:categoryId/:courseId" element={<LessonPage />} />
              <Route path="/berita" element={<BeritaPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/signin" element={<SignInPage />} />
              <Route path="/signup" element={<SignUpPage />} />
              <Route path="/screening" element={<Navigate to="/screening/mchat" replace />} />
              <Route path="/screening/gaze" element={<ScreeningPage />} />
              <Route path="/screening/mchat" element={<ScreeningPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
          </BrowserRouter>
        </ChildProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
