import React from "react";
import { ChevronDown } from "lucide-react";
import { CHAPTERS } from "../mock";

const Sidebar = ({ open, openChapters, onToggleChapter, activeModuleId, onSelectModule, chapters = CHAPTERS }) => {
  return (
    <aside
      className={`shrink-0 transition-all duration-300 overflow-hidden ${
        open ? "w-[220px] opacity-100" : "w-0 opacity-0"
      }`}
    >
      <div className="p-3 space-y-4">
        {chapters.map((chapter, idx) => {
          const isOpen = openChapters.includes(chapter.id);
          const isPrimary = idx === 0;
          return (
            <div
              key={chapter.id}
              className={`rounded-2xl transition-all duration-300 ${
                isPrimary
                  ? "bg-[#eefafa] ring-2 ring-[#7fd8d3] shadow-[0_6px_18px_-8px_rgba(111,204,203,0.8)]"
                  : ""
              }`}
            >
              {/* Chapter header */}
              <button
                onClick={() => onToggleChapter(chapter.id)}
                className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-b from-[#7fd8d3] to-[#6fcccb] text-white shadow-sm hover:brightness-105 transition-all`}
              >
                <span className="font-nunito italic font-bold text-[14px]">
                  {chapter.title}
                </span>
                <ChevronDown
                  size={18}
                  className={`transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Modules */}
              <div
                className={`grid transition-all duration-300 ${
                  isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-2 py-2 space-y-1">
                    {chapter.modules.map((m) => {
                      const active = m.id === activeModuleId;
                      return (
                        <button
                          key={m.id}
                          onClick={() => onSelectModule(m, chapter.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg font-nunito text-[13px] transition-all duration-200 ${
                            active
                              ? "bg-white text-[#2c5f66] font-bold shadow-sm"
                              : "text-[#3c6d72] hover:bg-white/70"
                          }`}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;
