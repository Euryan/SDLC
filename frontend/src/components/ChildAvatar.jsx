import React from "react";

// Simple pastel initials avatar (no image needed)
const ChildAvatar = ({ name, size = 64, className = "" }) => {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <div
      className={`rounded-full bg-gradient-to-br from-[#8bdcd8] to-[#5bb9b8] flex items-center justify-center text-white font-fredoka font-semibold shadow-md ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  );
};

export default ChildAvatar;
