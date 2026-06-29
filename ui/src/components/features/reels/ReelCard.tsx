"use client";

import { ReelGroup } from '@/types/reel';
import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTranslations } from 'next-intl';

import { ReactionGroup } from './ReactionGroup';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';



interface Props {
  group: ReelGroup;
  onClick: (id: string) => void;
}

function ReelCardInner({ group, onClick }: Props) {
  const t = useTranslations('Reels');
  const [isViewed, setIsViewed] = useState(false);
  const [timeAgo, setTimeAgo] = useState('');
  const [isNew, setIsNew] = useState(false);

  const latestMediaId = group.media && group.media.length > 0 ? group.media[0].id : null;

  useEffect(() => {
    // Check sessionStorage với version 2 (track theo latest media ID)
    const viewedStr = sessionStorage.getItem('fastvisa_viewed_reels_v2');
    if (viewedStr && latestMediaId) {
      try {
        const viewedData = JSON.parse(viewedStr) as Record<string, string>;
        if (viewedData[group.id] === latestMediaId) {
          setTimeout(() => setIsViewed(true), 0);
        } else {
          setTimeout(() => setIsViewed(false), 0);
        }
      } catch (e) {
        console.error("Lỗi parse viewed reels", e);
        sessionStorage.removeItem('fastvisa_viewed_reels_v2');
      }
    } else {
        setTimeout(() => setIsViewed(false), 0); // Nếu có ảnh mới thêm thì luôn set false
    }
    
    // Format date on client to avoid hydration mismatch
    const updateTime = () => {
        const targetDate = group.updatedAt || group.createdAt;
        if (targetDate) {
            const dateObj = new Date(targetDate);
            const diffMs = Date.now() - dateObj.getTime();
            // Phải gọi setIsNew TRƯỚC khi return sớm để không bị bỏ qua khi reel vừa mới tạo
            setIsNew(diffMs <= 3 * 60 * 1000); // 3 phút
            if (diffMs < 60000) {
                setTimeAgo(t('justNow'));
                // Schedule exact update when "Vừa xong" expires
                const remaining = 60000 - diffMs;
                const id = setTimeout(updateTime, remaining);
                return () => clearTimeout(id);
            } else {
                setTimeAgo(formatDistanceToNow(dateObj, { addSuffix: true, locale: vi }));
            }
        }
    };
    return updateTime();
  }, [group.id, group.updatedAt, group.createdAt, latestMediaId, t]);

  const handleClick = () => {
    setIsViewed(true);
    // Lưu vào sessionStorage
    if (latestMediaId) {
      const viewedStr = sessionStorage.getItem('fastvisa_viewed_reels_v2');
      let viewedData: Record<string, string> = {};
      try {
        viewedData = viewedStr ? JSON.parse(viewedStr) : {};
      } catch (e) {
        sessionStorage.removeItem('fastvisa_viewed_reels_v2');
      }
      
      viewedData[group.id] = latestMediaId;
      sessionStorage.setItem('fastvisa_viewed_reels_v2', JSON.stringify(viewedData));
    }
    onClick(group.id);
  };

  const coverMedia = group.media?.[0];
  const coverImage = coverMedia?.url || 'https://via.placeholder.com/300x500';

  return (
    <div 
      className="relative w-full aspect-[9/16] rounded-2xl overflow-hidden cursor-pointer group hover:opacity-90 transition-opacity bg-black shadow-md"
      onClick={handleClick}
    >
      <div className="absolute inset-0 overflow-hidden">
          <Image sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" src={coverImage} alt={group.title || ''} fill className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-105" />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/30 pointer-events-none" />

      {/* Avatar góc trái */}
      <div className="absolute top-5 left-5 z-20">
        <Avatar className={cn(
            "w-12 h-12 border-[2px] shadow-md",
            isViewed ? "border-white/40" : "border-transparent ring-[3px] ring-blue-500"
        )}>
            <AvatarImage src={group.author?.avatar} className="object-cover" />
            <AvatarFallback className="bg-primary text-white font-semibold">
                {group.author?.name?.charAt(0) || 'A'}
            </AvatarFallback>
        </Avatar>
      </div>

      <div className="absolute bottom-5 left-5 right-5 text-white z-10 flex flex-col gap-1.5">
        <ReactionGroup reactions={group.reactions} className="mb-1" />
        <h3 className="font-bold text-white text-base line-clamp-2 leading-tight min-h-[2.5rem] flex items-end">
            {isNew && <span className="bg-red-500 text-white text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-sm mr-2 mb-0.5 inline-block shrink-0 leading-none">{t('badgeNew')}</span>}
            {group.title}
        </h3>
        <div className="flex items-center justify-between mt-0.5">
            <p className="text-xs text-gray-300 drop-shadow-md font-medium capitalize">
                {timeAgo || t('justNow')}
            </p>
            {group.media && group.media.length > 1 && (
                <span className="text-xs font-bold text-white bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-md drop-shadow-md shrink-0">
                    {t('morePhotos', { count: group.media.length - 1 })}
                </span>
            )}
        </div>
      </div>
    </div>
  );
}

export const ReelCard = React.memo(
  ReelCardInner,
  (prev, next) =>
    prev.group.id === next.group.id &&
    prev.group.updatedAt === next.group.updatedAt &&
    prev.group.createdAt === next.group.createdAt &&
    JSON.stringify(prev.group.reactions) === JSON.stringify(next.group.reactions) &&
    prev.group.media?.[0]?.id === next.group.media?.[0]?.id &&
    // Phải so sánh author để re-render khi admin cập nhật avatar/tên qua Pusher
    prev.group.author?.name === next.group.author?.name &&
    prev.group.author?.avatar === next.group.author?.avatar
);
