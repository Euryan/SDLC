import React, { useState } from "react";
import { Menu, ChevronDown, UserRound, LogIn } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { NAV_ITEMS, ASSETS } from "../mock";
import { useAuth } from "../context/AuthContext";

const NAV_ROUTES = {
  Home: "/",
  Course: "/course",
  Berita: "/berita",
};

const Logo = () => (
  <div className="flex items-center bg-white rounded-lg px-1.5 py-1 select-none">
    <img
      src={ASSETS.logo}
      alt="AutiGaze - Empathy in Motion"
      className="h-11 md:h-12 w-auto object-contain"
    />
  </div>
);

const Header = ({ onToggleSidebar }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [screeningMenuOpen, setScreeningMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const path = location.pathname;
  let activeNav = "Home";
  if (path === "/course" || path.startsWith("/course/") || path.startsWith("/lesson")) {
    activeNav = "Course";
  } else if (path.startsWith("/berita")) {
    activeNav = "Berita";
  } else if (path.startsWith("/screening")) {
    activeNav = "Screening";
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="flex items-stretch">
        {/* Logo pod */}
        <div className="flex items-center bg-white pl-4 pr-12 py-3 rounded-br-3xl shadow-sm">
          <Logo />
        </div>

        {/* Teal bar */}
        <div className="flex-1 bg-gradient-to-b from-[#7fd8d3] to-[#6fcccb] flex items-center justify-between px-5">
          {onToggleSidebar ? (
            <button
              onClick={onToggleSidebar}
              className="text-white/95 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/15"
              aria-label="Toggle menu"
            >
              <Menu size={26} strokeWidth={2.4} />
            </button>
          ) : (
            <span className="w-8" />
          )}

          <nav className="flex items-center gap-8">
            {NAV_ITEMS.map((item) => {
              const active = item === activeNav;
              if (item === "Screening") {
                return (
                  <div key={item} className="relative">
                    <button
                      onClick={() => setScreeningMenuOpen((open) => !open)}
                      className={`flex items-center gap-1 font-fredoka text-[22px] text-white transition-all duration-200 relative hover:scale-105 ${
                        active ? "font-semibold" : "font-normal text-white/90"
                      }`}
                      aria-expanded={screeningMenuOpen}
                      aria-haspopup="menu"
                    >
                      {item}
                      <ChevronDown
                        size={17}
                        className={`transition-transform duration-200 ${
                          screeningMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                      <span
                        className={`absolute -bottom-1 left-0 h-[2px] bg-white rounded-full transition-all duration-300 ${
                          active ? "w-full" : "w-0"
                        }`}
                      />
                    </button>
                    {screeningMenuOpen && (
                      <div className="absolute right-0 mt-3 w-52 bg-white rounded-xl shadow-lg overflow-hidden z-50">
                        <button
                          onClick={() => {
                            setScreeningMenuOpen(false);
                            navigate("/screening/gaze");
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-[#3c6d72] font-nunito hover:bg-[#eafafa] transition-colors"
                        >
                          Gaze Detection
                        </button>
                        <button
                          onClick={() => {
                            setScreeningMenuOpen(false);
                            navigate("/screening/mchat");
                          }}
                          className="w-full text-left px-4 py-3 text-sm text-[#3c6d72] font-nunito hover:bg-[#fff8e8] transition-colors"
                        >
                          M-CHAT
                        </button>
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <button
                  key={item}
                  onClick={() => navigate(NAV_ROUTES[item])}
                  className={`font-fredoka text-[22px] text-white transition-all duration-200 relative hover:scale-105 ${
                    active ? "font-semibold" : "font-normal text-white/90"
                  }`}
                >
                  {item}
                  <span
                    className={`absolute -bottom-1 left-0 h-[2px] bg-white rounded-full transition-all duration-300 ${
                      active ? "w-full" : "w-0"
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          <div className="relative">
            {user ? (
              <>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 text-white group"
                >
                  <span className="font-fredoka text-[15px] hidden sm:block">
                    {user.name}
                  </span>
                  <span className="h-9 w-9 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                    <UserRound size={20} className="text-[#4c9a9a]" />
                  </span>
                  <ChevronDown
                    size={16}
                    className={`transition-transform duration-200 ${
                      menuOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg overflow-hidden animate-fadeIn z-50">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#3c6d72] font-nunito hover:bg-[#eafafa] transition-colors"
                    >
                      Profil Anak
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/progress");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#3c6d72] font-nunito hover:bg-[#eafafa] transition-colors"
                    >
                      Progress Anak
                    </button>
                    {user.role === "admin" && (
                      <button
                        onClick={() => {
                          setMenuOpen(false);
                          navigate("/admin");
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#3c6d72] font-nunito hover:bg-[#eafafa] transition-colors"
                      >
                        Admin Konten
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                        navigate("/signin");
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-[#eb5757] font-nunito hover:bg-[#ffeaea] transition-colors"
                    >
                      Keluar
                    </button>
                  </div>
                )}
              </>
            ) : (
              <button
                onClick={() => navigate("/signin")}
                className="flex items-center gap-2 bg-white text-[#2c7d7d] hover:bg-[#f2fbfb] font-fredoka font-medium text-[15px] px-4 py-2 rounded-xl shadow-sm transition-colors"
              >
                <LogIn size={17} /> Masuk
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
