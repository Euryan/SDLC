import React from "react";
import { Badge } from "./ui/badge";

const NewsCard = ({ news, onRead }) => (
  <article className="flex flex-col bg-white rounded-2xl overflow-hidden shadow-[0_8px_22px_-14px_rgba(80,140,150,0.8)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
    <div className="relative h-40 overflow-hidden group">
      <img
        src={news.image}
        alt={news.title}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
      />
      <Badge className="absolute top-3 left-3 bg-[#6fcccb] hover:bg-[#6fcccb] text-white border-0 font-nunito font-bold text-[11px] px-2.5 py-0.5 rounded-full">
        {news.tag}
      </Badge>
    </div>
    <div className="flex flex-col flex-1 p-4">
      <h3 className="font-nunito font-extrabold text-[15px] text-[#2c4f63] leading-snug mb-2">
        {news.title}
      </h3>
      <p className="font-nunito text-[13px] text-[#5c777c] leading-relaxed line-clamp-3 flex-1">
        {news.excerpt}
      </p>
      <button
        onClick={() => onRead(news)}
        className="mt-3 self-start font-nunito text-[13px] font-bold text-[#3aa0a0] hover:text-[#2c7d7d] transition-colors"
      >
        Baca selengkapnya →
      </button>
    </div>
  </article>
);

export default NewsCard;
