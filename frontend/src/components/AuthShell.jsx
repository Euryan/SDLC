import React from "react";
import { useNavigate } from "react-router-dom";
import { ASSETS } from "../mock";

// Shared branded shell for auth screens
const AuthShell = ({ title, subtitle, children, footer }) => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#eafafa] via-[#f4f6f7] to-[#e5f4f6] flex flex-col">
      <div className="p-5">
        <button
          onClick={() => navigate("/")}
          className="inline-flex items-center bg-white rounded-xl px-2 py-1 shadow-sm"
        >
          <img src={ASSETS.logo} alt="AutiGaze" className="h-10 w-auto object-contain" />
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 pb-10">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-[0_20px_50px_-25px_rgba(80,140,150,0.9)] p-7 md:p-8">
            <h1 className="font-fredoka font-semibold text-[26px] text-[#2c5f66] text-center">
              {title}
            </h1>
            {subtitle && (
              <p className="font-nunito text-[14px] text-[#8aa0a3] text-center mt-1 mb-6">
                {subtitle}
              </p>
            )}
            {children}
          </div>
          {footer && <div className="text-center mt-5">{footer}</div>}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
