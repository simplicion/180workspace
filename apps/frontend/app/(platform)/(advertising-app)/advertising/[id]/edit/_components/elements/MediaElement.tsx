'use client';
import React, { useEffect, useRef } from 'react';
import { ElementProps, containerTag, animationAttrs, cx } from './shared';

const VIDEO_EXT = /\.(mp4|webm|ogv|m3u8)$/;

export function MediaElement({ node, setNodeRef, style, className, wrapperClass, handleClick, renderControls, renderPaddingControls, isReadOnly, animationProps, animKey }: ElementProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaUrl: string | undefined = node.data?.imageUrl || node.data?.videoUrl;
    const path = typeof mediaUrl === 'string' ? mediaUrl.split(/[?#]/)[0].toLowerCase() : '';
    const isHls = path.endsWith('.m3u8');
    const isVideo = !!mediaUrl && VIDEO_EXT.test(path);

    // Existing nodes keep their behaviour (autoplay muted loop); `data.autoplay === false` opts out.
    const autoplay = node.data?.autoplay !== false;
    const muted = autoplay ? true : !!node.data?.muted;
    const loop = node.data?.loop !== false;
    const controls = node.data?.controls !== false;
    const eager = node.data?.priority === true || node.data?.loading === 'eager';

    // HLS only: hls.js is loaded on demand and destroyed on cleanup. Plain files use the `src` attribute.
    useEffect(() => {
        const video = videoRef.current;
        if (!isHls || !video || !mediaUrl) return;
        let cancelled = false;
        let hls: { destroy: () => void } | null = null;
        import('hls.js')
            .then(({ default: Hls }) => {
                if (cancelled) return;
                if (Hls.isSupported()) {
                    const instance = new Hls();
                    instance.loadSource(mediaUrl);
                    instance.attachMedia(video);
                    hls = instance;
                } else {
                    video.src = mediaUrl; // Safari / iOS native HLS
                }
            })
            .catch(() => {
                if (!cancelled && video.canPlayType('application/vnd.apple.mpegurl')) video.src = mediaUrl;
            });
        return () => {
            cancelled = true;
            hls?.destroy();
        };
    }, [mediaUrl, isHls]);

    const MediaContainerTag = containerTag(animationProps);

    return (
        <MediaContainerTag
            key={animKey}
            ref={setNodeRef as any}
            data-element-type="media"
            style={style}
            onClick={isReadOnly ? undefined : handleClick}
            className={cx(className, wrapperClass)}
            {...animationAttrs(animationProps)}
        >
            {!isReadOnly && renderControls?.()}
            {!isReadOnly && renderPaddingControls?.()}
            {mediaUrl ? (
                isVideo ? (
                    <video
                        ref={videoRef}
                        src={isHls ? undefined : mediaUrl}
                        controls={controls}
                        autoPlay={autoplay}
                        muted={muted}
                        loop={loop}
                        playsInline
                        preload={autoplay ? 'auto' : 'metadata'}
                        poster={node.data?.poster || undefined}
                    />
                ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={mediaUrl}
                        alt={node.data?.alt || ''}
                        loading={eager ? 'eager' : 'lazy'}
                        decoding="async"
                        {...(eager ? { fetchPriority: 'high' as const } : {})}
                    />
                )
            ) : isReadOnly ? null : (
                <div className="w-full h-full min-h-[150px] bg-gray-100 flex items-center justify-center rounded-xl border border-gray-200">
                    <span className="text-gray-400 text-sm font-bold">Media (Upload Image/Video)</span>
                </div>
            )}
        </MediaContainerTag>
    );
}
