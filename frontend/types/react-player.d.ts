declare module 'react-player' {
    import { Component, ReactNode } from 'react';

    interface ReactPlayerProps {
        url?: string | string[] | MediaStream;
        playing?: boolean;
        loop?: boolean;
        controls?: boolean;
        volume?: number;
        muted?: boolean;
        width?: string | number;
        height?: string | number;
        style?: React.CSSProperties;
        progressInterval?: number;
        playsinline?: boolean;
        pip?: boolean;
        stopOnUnmount?: boolean;
        light?: boolean | string;
        surfaceMode?: 'native' | 'css' | 'vp9' | 'vp8+h264';
        showdownloaded?: boolean;
        fallback?: ReactNode;
        className?: string;
        onReady?: () => void;
        onStart?: () => void;
        onPlay?: () => void;
        onPause?: () => void;
        onBuffer?: () => void;
        onBufferEnd?: () => void;
        onSeek?: (seconds: number) => void;
        onEnded?: () => void;
        onError?: (error: Error) => void;
        onProgress?: (state: { played: number; playedSeconds: number; loaded: number; loadedSeconds: number }) => void;
        onDuration?: (duration: number) => void;
        onEnablePIP?: (event: Event) => void;
        onDisablePIP?: (event: Event) => void;
        config?: {
            file?: {
                attributes?: React.VideoHTMLAttributes<HTMLVideoElement>;
                forceAudio?: boolean;
                forceVideo?: boolean;
                forceHLS?: boolean;
                forceDASH?: boolean;
                hlsOptions?: object;
                hlsConfig?: object;
                dashOptions?: object;
            };
            youtube?: {
                playerVars?: object;
                preload?: boolean;
                onError?: (error: Error) => void;
            };
            facebook?: {
                appId?: string;
            };
            soundcloud?: {
                options?: object;
                onError?: (error: Error) => void;
            };
            stream?: {
                type?: string;
            };
        };
        ref?: React.Ref<ReactPlayer>;
    }

    export default class ReactPlayer extends Component<ReactPlayerProps> {
        seekTo: (amount: number, type?: 'seconds' | 'fraction') => void;
        seekSeconds: (seconds: number) => void;
        getCurrentTime: () => number;
        getDuration: () => number;
        getSecondsLoaded: () => number;
        getInternalPlayer: (attribute?: string) => object;
        showPreview: () => void;
        hidePreview: () => void;
        enablePIP: () => void;
        disablePIP: () => void;
    }
}
