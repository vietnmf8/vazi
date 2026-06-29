"use client"

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import styles from './SceneSlider.module.css';

import { useTranslations } from 'next-intl';

const getDestinations = () => [
    { id: 1, title: "Sa Pa", location: "Lào Cai", desc: "Thành phố mờ sương với cảnh sắc núi rừng hùng vĩ và ruộng bậc thang tuyệt đẹp.", img: "/images/vinh-ha-long.jpg" }, // Tạm mượn do chưa có đủ ảnh ở thư mục yêu cầu, tí update đúng đường dẫn.
    { id: 2, title: "Phố cổ Hội An", location: "Quảng Nam", desc: "Di sản văn hoá thế giới với nét đẹp cổ kính, lãng mạn của đèn lồng đêm.", img: "/images/hoi-an.webp" },
    { id: 3, title: "Vịnh Hạ Long", location: "Quảng Ninh", desc: "Di sản thiên nhiên thế giới với hàng nghìn hòn đảo đá vôi kỳ vĩ.", img: "/images/vinh-ha-long.jpg" },
    { id: 4, title: "Cầu Vàng", location: "Đà Nẵng", desc: "Biểu tượng du lịch với đôi bàn tay khổng lồ nâng đỡ cây cầu vàng.", img: "/images/cau-vang.webp" },
    { id: 5, title: "Tràng An", location: "Ninh Bình", desc: "Quần thể danh thắng kỳ vĩ với hệ thống hang động xuyên thủy độc đáo.", img: "/images/trang-an.webp" },
    { id: 6, title: "Bãi Sao", location: "Phú Quốc", desc: "Bãi biển đẹp nhất đảo ngọc với cát trắng mịn và nước biển trong xanh.", img: "/images/bai-sao.webp" },
    { id: 7, title: "Ruộng bậc thang", location: "Tây Bắc", desc: "Tuyệt tác thiên nhiên do bàn tay con người kiến tạo nên.", img: "/images/ruong-bac-thang.jpg" },
];

export function SceneSlider({ destinations: apiDest }: { destinations?: any[] }) {
    const t = useTranslations("AboutUsPage.SceneSlider");
    const containerRef = useRef<HTMLDivElement>(null);
    const destinations = getDestinations();

    // Khởi tạo activeIndex mặc định là 2 (Vịnh Hạ Long) để 5 thẻ đầu tiên hiển thị cân đối trên giao diện (2 thẻ bên trái, 2 thẻ bên phải)
    const [activeIndex, setActiveIndex] = useState(2);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    
    // State quản lý vật lý của lá bài đang bị chạm
    const [interactingCard, setInteractingCard] = useState<{
        index: number;
        origin: string;
        baseRotateX: number;
        baseRotateY: number;
        isReleasing: boolean;
    } | null>(null);

    // Refs
    const startX = useRef(0);
    const startTime = useRef(0);
    const dragRef = useRef(false);
    // Ref quản lý timeout để giữ tâm xoay đến khi hiệu ứng nảy kết thúc
    const releaseTimeoutRef = useRef<NodeJS.Timeout | null>(null); 

    // Hằng số Vật lý
    const SWIPE_VELOCITY_THRESHOLD = 0.5;
    const RUBBER_BAND_FRICTION = 0.3;

    // Lắng nghe kích thước màn hình
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        // Xoá timeout cũ nếu người dùng nhấn lại nhanh trước khi thẻ hồi xong
        if (releaseTimeoutRef.current) {
            clearTimeout(releaseTimeoutRef.current);
        }

        e.currentTarget.setPointerCapture(e.pointerId);
        
        dragRef.current = true;
        setIsDragging(true);
        startX.current = e.clientX;
        startTime.current = Date.now();
        setDragOffset(0);

        const targetCard = (e.target as HTMLElement).closest(`.${styles.card}`);
        if (targetCard) {
            const index = parseInt((targetCard as HTMLElement).dataset.index || '0', 10);
            const rect = targetCard.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const normX = (x / rect.width) * 2 - 1;
            const normY = (y / rect.height) * 2 - 1;

            const isLeft = x < rect.width / 2;
            const isTop = y < rect.height / 2;
            
            const pivotX = isLeft ? '0%' : '100%';
            const pivotY = isTop ? '100%' : '0%';

            const MAX_TILT = 15;
            setInteractingCard({
                index: index,
                origin: `${pivotX} ${pivotY}`,
                baseRotateX: -normY * MAX_TILT,
                baseRotateY: normX * MAX_TILT,
                isReleasing: false // Biến cờ hiệu trạng thái "Đang hồi lại"
            });
        }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        const currentX = e.clientX;
        const currentOffset = currentX - startX.current;
        setDragOffset(currentOffset);
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
        if (!dragRef.current) return;
        dragRef.current = false;
        setIsDragging(false);
        e.currentTarget.releasePointerCapture(e.pointerId);

        const currentDragOffset = e.clientX - startX.current;
        
        // Chuyển thẻ sang trạng thái "Đang hồi lại" (isReleasing) để nó nảy về góc 0 
        // nhưng vẫn giữ nguyên Pivot Point thay vì reset về center ngay lập tức.
        setInteractingCard(prev => {
            if (prev) return { ...prev, isReleasing: true };
            return null;
        });

        // Đợi 600ms (Bằng với thời gian CSS transition của đàn hồi) rồi mới dọn dẹp bộ nhớ
        releaseTimeoutRef.current = setTimeout(() => {
            setInteractingCard(null);
        }, 600); 

        // Xử lý Vuốt / Chuyển thẻ
        if (Math.abs(currentDragOffset) < 10) {
            setDragOffset(0);
            return;
        }

        const timeElapsed = Date.now() - startTime.current;
        const velocity = currentDragOffset / timeElapsed;
        const SENSITIVITY = isMobile ? 100 : 180;

        let virtualIndex = activeIndex - (currentDragOffset / SENSITIVITY);
        let targetIndex = Math.round(virtualIndex);

        if (Math.abs(velocity) > SWIPE_VELOCITY_THRESHOLD) {
            targetIndex = velocity < 0 ? Math.ceil(virtualIndex) : Math.floor(virtualIndex);
        }

        targetIndex = Math.max(0, Math.min(destinations.length - 1, targetIndex));
        setActiveIndex(targetIndex);
        setDragOffset(0);
    };

    const handleCardClick = (index: number) => {
        if (Math.abs(dragOffset) > 10) return;
        if (activeIndex !== index) setActiveIndex(index);
    };

    // Tính toán Layout ảo
    const SENSITIVITY = isMobile ? 100 : 180;
    let virtualIndex = activeIndex - (dragOffset / SENSITIVITY);
    
    if (virtualIndex < 0) {
        virtualIndex = virtualIndex * RUBBER_BAND_FRICTION;
    } else if (virtualIndex > destinations.length - 1) {
        const excess = virtualIndex - (destinations.length - 1);
        virtualIndex = (destinations.length - 1) + (excess * RUBBER_BAND_FRICTION);
    }

    const horizontalSpread = isMobile ? 75 : 155;
    const verticalDrop = isMobile ? 18 : 28;
    const rotationAngle = isMobile ? 12 : 10;

    return (
        <div data-ai-target="about_scene_slider" className="relative w-full py-8 flex flex-col items-center">
            <div 
                className={cn(
                    styles.sliderContainer, 
                    "relative w-full h-[500px] md:h-[620px] max-w-7xl mx-auto flex justify-center items-center",
                    isDragging && styles.dragging
                )}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                aria-label="Vietnamese scenic spots interactive slider"
            >
                {destinations.map((dest, index) => {
                    const offset = index - virtualIndex;
                    const absOffset = Math.abs(offset);

                    const translateX = offset * horizontalSpread;
                    const translateY = absOffset * verticalDrop;
                    const rotateZ = offset * rotationAngle;
                    const scale = Math.max(0.6, 1 - (absOffset * 0.08));
                    const zIndex = 100 - Math.round(absOffset);
                    const opacity = absOffset > 2.5 ? 0 : 1 - (absOffset * 0.15);
                    const isActive = Math.round(virtualIndex) === index;

                    let innerStyle: React.CSSProperties = {};
                    if (interactingCard && interactingCard.index === index) {
                        // Nếu nhả tay ra (isReleasing), giữ nguyên transformOrigin nhưng ép các góc xoay về 0.
                        if (interactingCard.isReleasing) {
                            innerStyle = {
                                transformOrigin: interactingCard.origin,
                                transform: `scale(1) rotateX(0deg) rotateY(0deg) rotateZ(0deg)`
                            };
                        } else {
                            // Lúc đang kéo thả
                            const pivotY = interactingCard.origin.split(' ')[1];
                            let bendingRotateZ = pivotY === '100%' ? dragOffset * 0.15 : -dragOffset * 0.15;
                            bendingRotateZ = Math.max(-25, Math.min(25, bendingRotateZ));

                            innerStyle = {
                                transformOrigin: interactingCard.origin,
                                transform: `scale(0.95) rotateX(${interactingCard.baseRotateX}deg) rotateY(${interactingCard.baseRotateY}deg) rotateZ(${bendingRotateZ}deg)`
                            };
                        }
                    }

                    return (
                        <div 
                            key={dest.id}
                            data-index={index}
                            className={cn(
                                styles.card, 
                                isActive && styles.active, 
                                "w-[300px] h-[400px] md:w-[380px] md:h-[520px]"
                            )}
                            style={{
                                transform: `translate(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px)) rotate(${rotateZ}deg) scale(${scale})`,
                                zIndex: zIndex,
                                opacity: opacity,
                                pointerEvents: absOffset > 2 ? 'none' : 'auto'
                            }}
                            onClick={() => handleCardClick(index)}
                        >
                            <div className={cn(styles.cardInner, "bg-white dark:bg-[#0a2e26] rounded-[32px] shadow-xl p-3 flex flex-col")} style={innerStyle}>
                                <div className="border-[2px] border-gray-100 dark:border-white/10 rounded-[20px] w-full h-full flex flex-col p-4">
                                    <div className="mb-2 flex items-center gap-1.5">
                                        <MapPin className="size-4 text-(--color-primary)" />
                                        <span className="text-xs font-semibold text-(--color-primary) uppercase tracking-wider">{dest.location}</span>
                                    </div>
                                    <div className="mb-2">
                                        <h2 className="text-2xl font-extrabold text-gray-800 dark:text-white tracking-tight leading-none font-family-heading">
                                            {dest.title}
                                        </h2>
                                    </div>
                                    <div className="mb-4">
                                        <p className="text-sm text-gray-500 dark:text-gray-300 font-medium leading-snug line-clamp-2">
                                            {dest.desc}
                                        </p>
                                    </div>
                                    <div className="flex-1 w-full rounded-[12px] overflow-hidden bg-gray-50 dark:bg-black/30 shadow-inner relative group">
                                        <Image 
                                            src={dest.img} 
                                            alt={dest.title} 
                                            fill
                                            className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110 pointer-events-none" 
                                            draggable={false}
                                            sizes="(max-width: 768px) 300px, 380px"
                                            priority={index === activeIndex || index === activeIndex + 1 || index === activeIndex - 1}
                                        />
                                        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 group-hover:bg-transparent dark:group-hover:bg-transparent transition-all duration-300 pointer-events-none"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="flex gap-4 mt-8 z-20">
                <button 
                    onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
                    aria-label="Previous destination"
                    className="flex size-12 items-center justify-center rounded-full border border-(--color-border-strong) bg-(--color-surface-1)/80 backdrop-blur-sm text-(--color-text-primary) hover:text-(--color-primary) hover:border-(--color-primary)/50 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={activeIndex === 0}
                >
                    <ChevronLeft className="size-5" />
                </button>
                <button 
                    onClick={() => setActiveIndex(Math.min(destinations.length - 1, activeIndex + 1))}
                    aria-label="Next destination"
                    className="flex size-12 items-center justify-center rounded-full border border-(--color-border-strong) bg-(--color-surface-1)/80 backdrop-blur-sm text-(--color-text-primary) hover:text-(--color-primary) hover:border-(--color-primary)/50 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={activeIndex === destinations.length - 1}
                >
                    <ChevronRight className="size-5" />
                </button>
            </div>
        </div>
    );
}
