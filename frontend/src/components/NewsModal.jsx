import React from "react";
import { ExternalLink } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Badge } from "./ui/badge";

const NewsModal = ({ news, open, onOpenChange }) => {
  if (!news) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 rounded-2xl">
        <div className="relative h-56 md:h-64 w-full overflow-hidden">
          <img
            src={news.image}
            alt={news.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <Badge className="absolute top-4 left-4 bg-[#6fcccb] hover:bg-[#6fcccb] text-white border-0 font-nunito font-bold px-3 py-1 rounded-full">
            {news.tag}
          </Badge>
        </div>

        <div className="p-6 max-h-[45vh] overflow-y-auto">
          <DialogHeader className="space-y-1 text-left">
            <DialogTitle className="font-nunito font-extrabold text-[20px] text-[#2c4f63] leading-snug">
              {news.title}
            </DialogTitle>
            <p className="font-nunito text-[12px] text-[#8aa0a3]">
              Sumber: <span className="font-semibold text-[#4c9a9a]">{news.source}</span>
            </p>
          </DialogHeader>

          <div className="mt-4 space-y-3">
            {news.content.split("\n\n").map((para, i) => (
              <p
                key={i}
                className="font-nunito text-[14px] text-[#4c6a70] leading-relaxed"
              >
                {para}
              </p>
            ))}
          </div>

          <a
            href={news.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 bg-[#6fcccb] hover:bg-[#5bb9b8] text-white font-nunito font-bold text-[14px] px-5 py-2.5 rounded-xl transition-colors"
          >
            Baca langsung dari sumber
            <ExternalLink size={16} />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewsModal;
