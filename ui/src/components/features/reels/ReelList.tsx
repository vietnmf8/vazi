'use client';

import { useState, useEffect, useCallback } from 'react';
import Pusher from 'pusher-js';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { ReelCard } from './ReelCard';
import { ReelGroup } from '@/types/reel';
import { 
  Reel, ReelContent, ReelProgress, ReelHeader, ReelImage, ReelNavigation, ReelControls, ReelNextButton, ReelPreviousButton 
} from '@/components/kibo-ui/reel';
import { X } from 'lucide-react';
import { SharedReaction } from '@/components/shared/reaction/SharedReaction';

import { useTranslations } from 'next-intl';
import { reactToReel } from '@/lib/api/reels.api';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useReelContext } from '@/components/kibo-ui/reel';

function ReelDynamicHeader({ activeGroup }: { activeGroup: ReelGroup }) {
  const { currentItem } = useReelContext();
  const [timeAgo, setTimeAgo] = useState('Vừa xong');

  useEffect(() => {
    const updateTime = () => {
      let targetDate = activeGroup.createdAt ? new Date(activeGroup.createdAt) : new Date();
      
      // Try to parse timestamp from media ID (format: "17382348234-0")
      if (currentItem?.id) {
        const parts = String(currentItem.id).split('-');
        if (parts.length >= 1) {
          const timestamp = parseInt(parts[0]);
          if (!isNaN(timestamp) && timestamp > 1600000000000 && timestamp < 2500000000000) {
            targetDate = new Date(timestamp);
          }
        }
      }

      const diffMs = Date.now() - targetDate.getTime();
      if (diffMs < 60000) {
        setTimeAgo('Vừa xong');
      } else {
        setTimeAgo(formatDistanceToNow(targetDate, { addSuffix: true, locale: vi }));
      }
    };
    
    updateTime();
    const intervalId = setInterval(updateTime, 60000);
    return () => clearInterval(intervalId);
  }, [activeGroup, currentItem]);

  return (
    <div className="flex items-center gap-3 text-white">
      {activeGroup.author?.avatar && (
        <img 
          src={activeGroup.author.avatar} 
          alt={activeGroup.author.name} 
          className="w-10 h-10 rounded-full border border-white/50 object-cover" 
        />
      )}
      <div className="flex flex-col">
        <span className="font-bold text-sm">{activeGroup.author?.name || 'Admin'}</span>
        <span className="text-xs text-white/70 capitalize">
          {timeAgo}
        </span>
      </div>
    </div>
  );
}
// import Autoplay from 'embla-carousel-autoplay';

export function ReelList({ reels }: { reels: ReelGroup[] }) {
  const t = useTranslations('Reels');
  const [localReels, setLocalReels] = useState<ReelGroup[]>(reels);
  const [activeGroup, setActiveGroup] = useState<ReelGroup | null>(null);
  const [activeTimeAgo, setActiveTimeAgo] = useState('');

  useEffect(() => {
    setTimeout(() => setLocalReels(reels), 0);
  }, [reels]);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_SOKETI_KEY;
    if (!key) return;

    const pusher = new Pusher(key, {
      cluster: process.env.NEXT_PUBLIC_SOKETI_CLUSTER || 'mt1',
      wsHost: process.env.NEXT_PUBLIC_SOKETI_HOST || '127.0.0.1',
      wsPort: Number(process.env.NEXT_PUBLIC_SOKETI_PORT || 6001),
      forceTLS: process.env.NEXT_PUBLIC_SOKETI_FORCE_TLS === 'true',
      enableStats: false,
    });

    const channel = pusher.subscribe('reels-channel');

    channel.bind('new-reel', (data: any) => {
      const newGroup: ReelGroup = {
        id: data.id,
        title: data.title,
        author: {
            name: data.authorName,
            avatar: data.authorAvatar || undefined,
        },
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        media: typeof data.media === 'string' ? JSON.parse(data.media) : data.media,
        reactions: [],
      };
      setLocalReels(prev => {
        // Prevent duplicate
        if (prev.some(g => g.id === newGroup.id)) return prev;
        
        const newReels = [newGroup, ...prev];
        return newReels.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          return timeB - timeA;
        });
      });
    });

    channel.bind('delete-reel', (data: { id: string }) => {
      setLocalReels(prev => prev.filter(group => group.id !== data.id));
    });

    channel.bind('update-reel', (data: any) => {
      setLocalReels(prev => {
        const updated = prev.map(group => {
          if (group.id === data.id) {
            return {
              ...group,
              title: data.title || group.title,
              media: typeof data.media === 'string' ? JSON.parse(data.media) : data.media,
              updatedAt: data.updatedAt || new Date().toISOString(),
            };
          }
          return group;
        });
        
        // Sort to ensure the most recently updated reel comes first
        return updated.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          return timeB - timeA;
        });
      });
    });
    channel.bind('new-reaction', (data: { reelId: string, reaction: any }) => {
      setLocalReels(prev => prev.map(group => {
        if (group.id === data.reelId) {
            // Prevent duplicate optimistic updates
            if (group.reactions?.some(r => r.id === data.reaction.id)) return group;
            return {
                ...group,
                reactions: [data.reaction, ...(group.reactions || [])]
            };
        }
        return group;
      }));
    });

    // Cập nhật realtime author (avatar, tên) khi admin thay đổi profile
    channel.bind('author-updated', (data: { name: string; avatar: string | null }) => {
      const newAuthor = { name: data.name, avatar: data.avatar ?? "" };
      setLocalReels(prev => prev.map(group => ({
        ...group,
        author: newAuthor,
      })));
      // Đồng bộ activeGroup để header modal cũng cập nhật ngay lập tức
      setActiveGroup(prev => prev ? { ...prev, author: newAuthor } : null);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, []);

  const handleReaction = async (emoji: string) => {
    if (!activeGroup) return;

    // Call API (Pusher will handle real-time update in 'new-reaction' event)
    await reactToReel(activeGroup.id, emoji);
  };

  const handleCardClick = useCallback((id: string) => {
    const group = localReels.find(g => g.id === id);
    if (group) setActiveGroup(group);
  }, [localReels]);

  if (!Array.isArray(localReels) || localReels.length === 0) return null;

  return (
    <section className="w-full max-w-6xl mx-auto py-8 px-4">
      <h2 className="text-2xl font-bold mb-4">{t('highlights')}</h2>
      <Carousel 
        opts={{ align: 'center', loop: false }}
        /* plugins={[
          Autoplay({
            delay: 4000,
            stopOnInteraction: false,
            stopOnMouseEnter: true,
          }),
        ]} */
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {localReels.map((group) => (
            <CarouselItem key={group.id} className="pl-2 md:pl-4 basis-1/2 md:basis-1/3">
              <ReelCard group={group} onClick={handleCardClick} />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex" />
        <CarouselNext className="hidden md:flex" />
      </Carousel>
      
      {activeGroup && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center">
          <button 
            className="absolute top-4 right-4 text-white z-[60] p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors" 
            onClick={() => setActiveGroup(null)}
          >
            <X size={24} />
          </button>
          
          <div className="w-full h-full max-w-6xl mx-auto flex items-center justify-center relative">
            <Reel 
              className="h-[90vh] max-h-[800px] aspect-[9/16] overflow-visible bg-transparent relative"
              data={activeGroup.media.map(m => ({
                id: m.id,
                type: m.type,
                src: m.url,
                duration: m.duration || 5,
                title: activeGroup.title
              }))} 
            >
              <div className="absolute inset-0 rounded-xl overflow-hidden bg-[#ffffff]/10 shadow-2xl">
                <ReelProgress />
                <ReelHeader className="z-50 bg-gradient-to-b from-black/80 to-transparent pb-8">
                  <ReelDynamicHeader activeGroup={activeGroup} />
                </ReelHeader>
                <ReelContent>
                  {(item) => (
                    <div className="absolute inset-x-3 inset-y-24 overflow-hidden rounded-2xl shadow-xl bg-zinc-900 border border-white/10">
                      <ReelImage 
                        alt={item.title || ""} 
                        duration={item.duration} 
                        src={item.src} 
                        className="!relative !inset-0 !size-full object-cover"
                      />
                    </div>
                  )}
                </ReelContent>
                <ReelNavigation />
                <ReelControls className="z-40" />
                
                {/* Shared Reaction */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center z-50">
                  <SharedReaction onSelect={handleReaction} />
                </div>
              </div>

              {/* Outside buttons */}
              <div className="hidden md:block">
                <ReelPreviousButton className="absolute -left-20 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white" />
                <ReelNextButton className="absolute -right-20 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white" />
              </div>
            </Reel>
          </div>
        </div>
      )}
    </section>
  );
}
