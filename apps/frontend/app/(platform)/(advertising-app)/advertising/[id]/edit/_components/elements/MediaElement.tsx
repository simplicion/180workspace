import React, { useEffect, useRef } from 'react';
import { ElementProps } from './BoxElement';
import Hls from 'hls.js';

export function MediaElement({ node, setNodeRef, style, wrapperClass, handleClick, renderControls, renderPaddingControls, isReadOnly, viewMode }: ElementProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaUrl = node.data?.imageUrl || node.data?.videoUrl;
    const isVideo = mediaUrl && (mediaUrl.endsWith('.m3u8') || mediaUrl.endsWith('.mp4'));

    useEffect(() => {
        if (isVideo && videoRef.current && mediaUrl) {
            if (mediaUrl.endsWith('.m3u8') && Hls.isSupported()) {
                const hls = new Hls();
                hls.loadSource(mediaUrl);
                hls.attachMedia(videoRef.current);
            } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
                // For Safari
                videoRef.current.src = mediaUrl;
            } else {
                videoRef.current.src = mediaUrl;
            }
        }
    }, [mediaUrl, isVideo]);

    return (
        <div 
            ref={setNodeRef} 
            data-element-type="media"
            style={style} 
            onClick={isReadOnly ? undefined : handleClick} 
            className={`w-full max-w-full overflow-hidden ${wrapperClass}`}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            {mediaUrl ? (
                isVideo ? (
                    <video 
                        ref={videoRef}
                        controls 
                        autoPlay 
                        muted 
                        loop
                        playsInline
                        style={{ width: '100%', height: '100%', maxWidth: '100%', objectFit: 'cover', borderRadius: node.style?.borderRadius }} 
                    />
                ) : (
                    <img src={mediaUrl} alt={node.data?.alt || ''} style={{ width: '100%', height: '100%', maxWidth: '100%', objectFit: 'cover', borderRadius: node.style?.borderRadius }} />
                )
            ) : isReadOnly ? null : (
                <div className="w-full h-full min-h-[150px] bg-gray-100 flex items-center justify-center rounded-xl border border-gray-200">
                    <span className="text-gray-400 text-sm font-bold">Media (Upload Image/Video)</span>
                </div>
            )}
        </div>
    );
}
