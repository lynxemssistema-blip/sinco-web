import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Download, Smartphone, Aperture, Trash2 } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';

export default function CameraPage() {
    const { addToast } = useToast();
    const [mode, setMode] = useState<'menu' | 'live' | 'preview'>('menu');
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Stop stream on unmount
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const startLiveCamera = async () => {
        try {
            // Try environment first (back camera), fallback to user
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: { ideal: 'environment' } }
            });
            setStream(mediaStream);
            setMode('live');
            // Delay assignment slightly to ensure video element is mounted
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                    videoRef.current.play();
                }
            }, 100);
        } catch (err) {
            console.error(err);
            addToast({ type: 'error', title: 'Erro de Acesso', message: 'Não foi possível acessar a câmera. Verifique as permissões.' });
        }
    };

    const stopLiveCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
        setMode('menu');
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const dataUrl = canvas.toDataURL('image/png');
                setCapturedImage(dataUrl);
                stopLiveCamera(); // Stop camera and show preview
                setMode('preview');
                addToast({ type: 'success', title: 'Captura', message: 'Foto capturada com sucesso!' });
            }
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                if (event.target?.result) {
                    setCapturedImage(event.target.result as string);
                    setMode('preview');
                }
            };
            reader.readAsDataURL(file);
        }
    };

    const clearImage = () => {
        setCapturedImage(null);
        setMode('menu');
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const downloadImage = () => {
        if (capturedImage) {
            const link = document.createElement('a');
            link.href = capturedImage;
            link.download = `captura-${Date.now()}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            addToast({ type: 'success', title: 'Download', message: 'Imagem salva no dispositivo.' });
        }
    };

    return (
        <div className="space-y-6">
            <canvas ref={canvasRef} className="hidden" />

            {/* Main Menu Mode */}
            {mode === 'menu' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-card border border-border rounded-xl shadow-sm p-8 flex flex-col items-center text-center hover:border-primary/50 transition-colors">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
                            <Smartphone size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Câmera Nativa</h3>
                        <p className="text-muted-foreground mb-6">Use o aplicativo de câmera padrão do seu celular para tirar fotos com máxima qualidade.</p>

                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:brightness-110 transition-all shadow-lg shadow-primary/20 flex items-center justify-center gap-2"
                        >
                            <Camera size={20} />
                            Abrir Câmera
                        </button>
                    </div>

                    <div className="bg-card border border-border rounded-xl shadow-sm p-8 flex flex-col items-center text-center hover:border-primary/50 transition-colors">
                        <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center text-accent-foreground mb-4">
                            <Aperture size={32} />
                        </div>
                        <h3 className="text-xl font-bold mb-2">Web Câmera</h3>
                        <p className="text-muted-foreground mb-6">Capture imagens diretamente pelo navegador sem sair do sistema.</p>

                        <button
                            onClick={startLiveCamera}
                            className="w-full bg-secondary text-secondary-foreground py-3 rounded-lg font-bold hover:bg-secondary/80 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={20} />
                            Iniciar WebCam
                        </button>
                    </div>
                </div>
            )}

            {/* Live Camera Mode */}
            {mode === 'live' && (
                <div className="flex flex-col items-center animate-fade-in space-y-4">
                    <div className="relative w-full max-w-lg aspect-[3/4] md:aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border-4 border-white ring-4 ring-black/10">
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="w-48 h-48 border border-white/30 rounded-lg"></div>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full max-w-lg">
                        <button
                            onClick={stopLiveCamera}
                            className="flex-1 bg-muted text-muted-foreground py-3 rounded-lg font-bold hover:bg-muted/80"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={capturePhoto}
                            className="flex-2 w-full bg-primary text-primary-foreground py-3 px-8 rounded-lg font-bold hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary/25 flex items-center justify-center gap-2"
                        >
                            <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse"></div>
                            Capturar
                        </button>
                    </div>
                </div>
            )}

            {/* Preview Mode */}
            {mode === 'preview' && capturedImage && (
                <div className="flex flex-col items-center animate-fade-in space-y-6">
                    <div className="bg-card p-2 rounded-2xl border shadow-lg max-w-lg w-full">
                        <img src={capturedImage} alt="Capture" className="w-full rounded-xl" />
                    </div>

                    <div className="flex flex-wrap gap-3 justify-center w-full max-w-lg">
                        <button
                            onClick={clearImage}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold border border-border hover:bg-muted transition-colors"
                        >
                            <Trash2 size={18} className="text-destructive" />
                            Descartar
                        </button>
                        <button
                            onClick={downloadImage}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-primary text-primary-foreground hover:brightness-110 shadow-lg transition-colors"
                        >
                            <Download size={18} />
                            Baixar Imagem
                        </button>
                        <button
                            onClick={() => setMode('menu')}
                            className="flex items-center gap-2 px-6 py-3 rounded-lg font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
                        >
                            <RefreshCw size={18} />
                            Nova Foto
                        </button>
                    </div>
                </div>
            )}

            {/* Info Footer */}
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex items-start gap-3 text-sm">
                <Smartphone className="shrink-0 mt-0.5" size={16} />
                <p>
                    <strong>Dica Pro:</strong> Em dispositivos móveis, a opção "Câmera Nativa" oferece a melhor qualidade e estabilização de imagem.
                    Use "Web Câmera" para digitalizações rápidas em desktops ou quando a nativa não estiver acessível.
                </p>
            </div>
        </div>
    );
}
