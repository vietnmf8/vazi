import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Reaction {
    id: string;
    emoji: string;
    createdAt?: string;
}

interface ReactionGroupProps {
    reactions?: Reaction[];
    className?: string;
}

export function ReactionGroup({ reactions = [], className }: ReactionGroupProps) {
    if (!reactions || reactions.length === 0) return null;

    // Sắp xếp reaction mới nhất lên đầu (createdAt giảm dần)
    const sortedReactions = [...reactions].sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Lọc bỏ các emoji trùng lặp để avatar không bị hiển thị 3 cái tim giống hệt nhau (Tuỳ chọn)
    // Nhưng đề bài yêu cầu "Multi icon được sắp xếp theo icon được thả mới nhất", có thể trùng cũng được.
    // Lấy 3 icon mới nhất
    const displayReactions = sortedReactions.slice(0, 3);
    const extraCount = Math.max(0, sortedReactions.length - 3);

    const getIconSrc = (id: string) => {
        const map: Record<string, string> = {
            like: '/images/like.png',
            '👍': '/images/like.png',
            heart: '/images/heart.png',
            '❤️': '/images/heart.png',
            haha: '/images/haha.png',
            '😂': '/images/haha.png',
            wow: '/images/wow.png',
            '😮': '/images/wow.png',
            sad: '/images/sad.png',
            '😢': '/images/sad.png',
            ungry: '/images/ungry.png',
            '😡': '/images/ungry.png'
        };
        return map[id] || null;
    };

    return (
        <div className={cn("flex items-center", className)}>
            <div className="flex -space-x-1.5">
                {displayReactions.map((reaction, index) => {
                    const src = getIconSrc(reaction.emoji);
                    return (
                        <div key={reaction.id || index} className="w-6 h-6 relative flex items-center justify-center rounded-full bg-black/40 border border-white/20 backdrop-blur-sm shadow-sm" style={{ zIndex: displayReactions.length - index }}>
                            {src ? (
                                <img 
                                    src={src} 
                                    alt={reaction.emoji} 
                                    className="w-full h-full object-contain drop-shadow-sm scale-110" 
                                />
                            ) : (
                                <span className="text-[14px] drop-shadow-md leading-none mb-[1px]">{reaction.emoji}</span>
                            )}
                        </div>
                    );
                })}
            </div>
            
            {reactions.length > 3 && (
                <div className="flex items-center justify-center w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 -ml-1 z-0 text-[11px] font-bold text-white shadow-sm">
                    +{reactions.length - 3}
                </div>
            )}
        </div>
    );
}
