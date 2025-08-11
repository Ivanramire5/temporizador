import React, { useState, useEffect, useRef } from "react";
import Swal from 'sweetalert2';
import { ref, set, onValue } from "firebase/database";
import { rtdb } from "../firebase/config";
import { useParams } from "react-router-dom";
import "../styles/timer.css";

export default function TimerDisplay() {
    const [inputValue, setInputValue] = useState("");
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [targetTime, setTargetTime] = useState(null);
    const intervalRef = useRef(null);
    const audioRef = useRef(null);
    const listenerRef = useRef(null);
    const hasPlayedAlarm = useRef(false);
    
    // Obtener codigo de useParams() (que corresponde a la sala)
    const params = useParams();
    const sala = params.codigo;

    // Debug: mostrar info de la sala
    useEffect(() => {
        console.log("Código/Sala actual:", sala);
        console.log("Params completos:", params);
    }, [sala, params]);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    // Listener para sincronizar el cronómetro desde Firebase
    useEffect(() => {
        if (!sala) {
            console.log("No hay sala disponible");
            return;
        }

        console.log("Configurando listener para sala:", sala);

        try {
            const salaRef = ref(rtdb, `salas/${sala}/cronometro`);
            
            // Configurar listener
            const unsubscribe = onValue(salaRef, (snapshot) => {
                console.log("Datos recibidos de Firebase:", snapshot.val());
                const data = snapshot.val();
                
                if (data && data.inicio && data.duracion) {
                    const endTime = data.inicio + data.duracion;
                    setTargetTime(endTime);
                    
                    const now = Math.floor(Date.now() / 1000);
                    const remainingTime = Math.max(0, endTime - now);
                    
                    console.log(`Tiempo restante: ${remainingTime}s`);
                    setTime(remainingTime);
                    setIsRunning(remainingTime > 0);
                    setIsConnected(true);
                    
                    // Reset la bandera de alarma cuando se inicia un nuevo cronómetro
                    if (remainingTime > 0) {
                        hasPlayedAlarm.current = false;
                    }
                } else {
                    console.log("No hay cronómetro activo");
                    setTime(0);
                    setIsRunning(false);
                    setTargetTime(null);
                    setIsConnected(true);
                    hasPlayedAlarm.current = false;
                }
            }, (error) => {
                console.error("Error en listener de Firebase:", error);
                setIsConnected(false);
            });

            listenerRef.current = unsubscribe;

        } catch (error) {
            console.error("Error al configurar Firebase listener:", error);
            setIsConnected(false);
        }

        // Cleanup
        return () => {
            if (listenerRef.current) {
                listenerRef.current();
                listenerRef.current = null;
            }
        };
    }, [sala]);

    // Actualizar el cronómetro cada segundo localmente
    useEffect(() => {
        if (isRunning && targetTime) {
            // Limpiar intervalo anterior si existe
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            // Crear nuevo intervalo para actualizar cada segundo
            intervalRef.current = setInterval(() => {
                const now = Math.floor(Date.now() / 1000);
                const remainingTime = Math.max(0, targetTime - now);
                
                setTime(remainingTime);
                
                // Si el tiempo llegó a 0, detener y reproducir alarma
                if (remainingTime === 0) {
                    setIsRunning(false);
                    clearInterval(intervalRef.current);
                    
                    // Solo reproducir la alarma una vez
                    if (!hasPlayedAlarm.current) {
                        hasPlayedAlarm.current = true;
                        playAlarm();
                    }
                }
            }, 100); // Actualizar cada 100ms para mayor precisión

            // Cleanup
            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        } else {
            // Limpiar intervalo si no está corriendo
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    }, [isRunning, targetTime]);

    const playAlarm = () => {
        console.log("Reproduciendo alarma...");
        
        // Intentar reproducir sonido con Web Audio API como fallback
        const playBeeps = () => {
            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                // Crear una secuencia de 3 beeps
                for (let i = 0; i < 3; i++) {
                    setTimeout(() => {
                        const oscillator = audioContext.createOscillator();
                        const gainNode = audioContext.createGain();
                        
                        oscillator.connect(gainNode);
                        gainNode.connect(audioContext.destination);
                        
                        oscillator.frequency.value = 800; // Frecuencia del sonido
                        oscillator.type = 'sine';
                        
                        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
                        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
                        
                        oscillator.start(audioContext.currentTime);
                        oscillator.stop(audioContext.currentTime + 0.5);
                    }, i * 600);
                }
            } catch (error) {
                console.log("Error con Web Audio API:", error);
            }
        };

        // Intentar primero con archivo de audio si existe
        try {
            if (!audioRef.current) {
                audioRef.current = new Audio("/sounds/alarm.mp3");
                audioRef.current.loop = false;
            }
            
            audioRef.current.play().catch(err => {
                console.log("No se pudo reproducir el archivo de audio, usando beeps:", err);
                playBeeps();
            });
        } catch (error) {
            console.log("Error con el audio, usando beeps:", error);
            playBeeps();
        }

        // Mostrar SweetAlert
        Swal.fire({
            title: "¡Tiempo cumplido!",
            text: "El cronómetro ha finalizado",
            icon: "success",
            confirmButtonText: "Parar alarma",
            confirmButtonColor: "#393E46",
            background: "#EEEEEE",
            color: "black",
            timer: 10000,
            timerProgressBar: true,
            customClass: {
                popup: 'custom-swal'
            },
            didOpen: () => {
                // Si no se pudo reproducir el archivo, usar beeps
                if (!audioRef.current || audioRef.current.paused) {
                    playBeeps();
                }
            }
        }).then(() => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
        });
    };

    const handleStart = () => {
        const parsed = parseInt(inputValue, 10);
        
        console.log("Intentando iniciar cronómetro:", { sala, parsed });

        // Validación
        if (!sala) {
            console.error("No hay sala disponible");
            Swal.fire({
                title: "Error de Sala",
                text: `No se pudo detectar la sala. Sala actual: ${sala}`,
                icon: "error",
                confirmButtonColor: "#393E46"
            });
            return;
        }

        if (isNaN(parsed) || parsed <= 0) {
            Swal.fire({
                title: "Tiempo Inválido",
                text: "Debes ingresar un número positivo de segundos.",
                icon: "error",
                confirmButtonColor: "#393E46"
            });
            return;
        }

        // Iniciar cronómetro en Firebase
        try {
            const now = Math.floor(Date.now() / 1000);
            const salaRef = ref(rtdb, `salas/${sala}/cronometro`);
            
            const timerData = {
                inicio: now,
                duracion: parsed,
                iniciado_por: `user_${Date.now()}`,
                timestamp: now
            };

            console.log("Enviando datos a Firebase:", timerData);

            set(salaRef, timerData).then(() => {
                setInputValue("");
                console.log(`Cronómetro iniciado en sala ${sala} por ${parsed} segundos`);
                
                // Resetear la bandera de alarma
                hasPlayedAlarm.current = false;
            }).catch((error) => {
                console.error("Error al escribir en Firebase:", error);
                Swal.fire({
                    title: "Error de Firebase",
                    text: `No se pudo iniciar el cronómetro: ${error.message}`,
                    icon: "error",
                    confirmButtonColor: "#393E46"
                });
            });

        } catch (error) {
            console.error("Error general al iniciar cronómetro:", error);
            Swal.fire({
                title: "Error",
                text: `Error inesperado: ${error.message}`,
                icon: "error",
                confirmButtonColor: "#393E46"
            });
        }
    };

    const handleStop = () => {
        if (!sala) return;

        try {
            const salaRef = ref(rtdb, `salas/${sala}/cronometro`);
            set(salaRef, null).then(() => {
                setTime(0);
                setIsRunning(false);
                setTargetTime(null);
                hasPlayedAlarm.current = false;
                console.log("Cronómetro detenido");
            }).catch((error) => {
                console.error("Error al detener cronómetro:", error);
            });
        } catch (error) {
            console.error("Error al detener:", error);
        }
    };

    // Cleanup cuando el componente se desmonta
    useEffect(() => {
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            if (audioRef.current) {
                audioRef.current.pause();
            }
            if (listenerRef.current) {
                listenerRef.current();
            }
        };
    }, []);

    return (
        <div className="divTimer">
            {/* Información de debug */}
            <div style={{ 
                position: 'absolute', 
                top: '10px', 
                left: '10px', 
                fontSize: '12px', 
                color: '#666',
                background: 'rgba(255,255,255,0.8)',
                padding: '5px',
                borderRadius: '4px'
            }}>
                Sala: {sala || 'No detectada'} | 
                Modo: Firebase RTDB |
                Estado: {isConnected ? 'Conectado' : 'Desconectado'} |
                Firebase: {rtdb ? 'OK' : 'Error'}
            </div>

            <h1 className="h1Timer">{formatTime(time)}</h1>
            
            {!isRunning && (
                <div className="formTimer">
                    <input
                        className="inputTimer"
                        type="number"
                        placeholder="Tiempo en segundos"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        min="1"
                        max="3600"
                    />
                    <br />
                    <button 
                        className="buttonTimer" 
                        onClick={handleStart}
                        disabled={!sala}
                    >
                        Iniciar cronómetro
                    </button>
                    
                    {!sala && (
                        <p style={{ color: 'red', marginTop: '10px' }}>
                            No se detectó la sala
                        </p>
                    )}
                </div>
            )}
            
            {isRunning && (
                <div>
                    <p className="pTimer">Cronómetro en marcha...</p>
                    <button 
                        className="buttonTimer" 
                        onClick={handleStop}
                        style={{ marginTop: '10px', backgroundColor: '#dc3545' }}
                    >
                        Detener cronómetro
                    </button>
                </div>
            )}

            {sala && (
                <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
                    Conectado a la sala: <strong>{sala}</strong> (Firebase RTDB)
                </div>
            )}

            <div style={{ 
                marginTop: '20px', 
                fontSize: '12px', 
                color: '#999',
                textAlign: 'center'
            }}>
                ✅ Cronómetro colaborativo con Firebase
            </div>
        </div>
    );
}