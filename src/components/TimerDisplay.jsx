import React, { useState, useEffect, useRef } from "react";
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
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

    const params = useParams();
    const sala = params.codigo;

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    
    useEffect(() => {
        if (!sala) return;

        try {
            const salaRef = ref(rtdb, `salas/${sala}/cronometro`);
            const unsubscribe = onValue(salaRef, (snapshot) => {
                const data = snapshot.val();
                if (data && data.inicio && data.duracion) {
                    const endTime = data.inicio + data.duracion;
                    setTargetTime(endTime);

                    const now = Math.floor(Date.now() / 1000);
                    const remainingTime = Math.max(0, endTime - now);

                    setTime(remainingTime);
                    setIsRunning(remainingTime > 0);
                    setIsConnected(true);

                    if (remainingTime > 0) {
                        hasPlayedAlarm.current = false;
                    }
                } else {
                    setTime(0);
                    setIsRunning(false);
                    setTargetTime(null);
                    setIsConnected(true);
                    hasPlayedAlarm.current = false;
                }
            }, () => {
                setIsConnected(false);
            });

            listenerRef.current = unsubscribe;
        } catch {
            setIsConnected(false);
        }

        return () => {
            if (listenerRef.current) {
                listenerRef.current();
                listenerRef.current = null;
            }
        };
    }, [sala]);

    // Intervalo para actualizar el tiempo
    useEffect(() => {
        if (isRunning && targetTime) {
            if (intervalRef.current) clearInterval(intervalRef.current);

            intervalRef.current = setInterval(() => {
                const now = Math.floor(Date.now() / 1000);
                const remainingTime = Math.max(0, targetTime - now);
                setTime(remainingTime);

                if (remainingTime === 0) {
                    setIsRunning(false);
                    clearInterval(intervalRef.current);
                    if (!hasPlayedAlarm.current) {
                        hasPlayedAlarm.current = true;
                        playAlarm();
                    }
                }
            }, 1000);

            return () => clearInterval(intervalRef.current);
        } else {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    }, [isRunning, targetTime]);

    
    const playAlarm = () => {
        console.log('Iniciando alarma con loop protegido');

        let beepIntervalId = null;
        let isActive = true;
        let beepCount = 0;
        let alarmStarted = false;

        const createBeepWithNewContext = () => {
            if (!isActive) {
                console.log('Intento de beep cancelado - isActive es false');
                return;
            }

            beepCount++;
            console.log(` Creando beep #${beepCount}`);

            try {
                const audioContext = new (window.AudioContext || window.webkitAudioContext)();

                if (audioContext.state === 'suspended') {
                    audioContext.resume();
                }

                const oscillator = audioContext.createOscillator();
                const gainNode = audioContext.createGain();

                oscillator.connect(gainNode);
                gainNode.connect(audioContext.destination);

                oscillator.frequency.value = 800;
                oscillator.type = 'square';

                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.1);
                gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.6);

                oscillator.start(audioContext.currentTime);
                oscillator.stop(audioContext.currentTime + 0.6);

                console.log(` Beep #${beepCount} reproducido`);

                setTimeout(() => {
                    if (audioContext.state !== 'closed') {
                        audioContext.close();
                    }
                }, 700);

            } catch (error) {
                console.error(`Error en beep #${beepCount}:`, error);
            }
        };

        
        createBeepWithNewContext();

        // Intervalo de beeps
        beepIntervalId = setInterval(() => {
            console.log(` Intervalo ejecutándose - Beep count: ${beepCount}`);
            createBeepWithNewContext();
        }, 1200);

        console.log(` Intervalo creado con ID: ${beepIntervalId}`);

        const protectedStop = (source = 'unknown') => {
            console.log(`Intento de stop desde: ${source}`);

            // Solo permitir si ya empezó y se presiona desde el botón de SweetAlert
            if (!alarmStarted) {
                console.log(' Stop rechazado - Alarma aún no ha comenzado completamente');
                return;
            }

            console.log('Stop autorizado - Deteniendo alarma');
            isActive = false;
            if (beepIntervalId) {
                clearInterval(beepIntervalId);
                beepIntervalId = null;
            }
            console.log(` Alarma detenida después de ${beepCount} beeps`);
        };

        audioRef.current = { stopBeeps: () => protectedStop('SweetAlert button') };

        // Espera breve antes de permitir detener
        setTimeout(() => {
            alarmStarted = true;
            console.log(' Alarma oficialmente iniciada - Stop permitido');
        }, 500);

        
        Swal.fire({
            title: "¡Tiempo cumplido!",
            text: "El cronómetro ha finalizado",
            icon: "success",
            confirmButtonText: "Parar alarma",
            confirmButtonColor: "#393E46",
            background: "#EEEEEE",
            color: "black",
            customClass: { popup: 'custom-swal' },
            allowOutsideClick: false,
            allowEscapeKey: false,
            didOpen: () => {
                console.log(' SweetAlert abierto');
            }
        }).then(() => {
            console.log(' Usuario presionó botón SweetAlert');
            protectedStop('SweetAlert button');
        });
    };
    const handleStart = () => {
        const parsed = parseInt(inputValue, 10);
        if (!sala || isNaN(parsed) || parsed <= 0) return;

        try {
            const now = Math.floor(Date.now() / 1000);
            const salaRef = ref(rtdb, `salas/${sala}/cronometro`);
            const timerData = {
                inicio: now,
                duracion: parsed,
                iniciado_por: `user_${Date.now()}`,
                timestamp: now
            };
            set(salaRef, timerData).then(() => {
                setInputValue("");
                hasPlayedAlarm.current = false;
            });
        } catch {}
    };

    const handleStop = () => {
        if (!sala) return;
        try {
            
            if (audioRef.current && audioRef.current.stopBeeps) {
                audioRef.current.stopBeeps();
            }
            
            const salaRef = ref(rtdb, `salas/${sala}/cronometro`);
            set(salaRef, null).then(() => {
                setTime(0);
                setIsRunning(false);
                setTargetTime(null);
                hasPlayedAlarm.current = false;
            });
        } catch {}
    };

    
    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (audioRef.current && audioRef.current.stopBeeps) {
                audioRef.current.stopBeeps();
            }
            if (listenerRef.current) listenerRef.current();
        };
    }, []);

    return (
        <div className="divTimer">
            <div class="dataTimer">
                Sala: {sala || 'No detectada'} | Modo: Firebase RTDB | Estado: {isConnected ? 'Conectado' : 'Desconectado'} | Firebase: {rtdb ? 'OK' : 'Error'}
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
                    <button className="buttonTimer" onClick={handleStart} disabled={!sala}>
                        Iniciar cronómetro
                    </button>
                    {!sala && <p></p>}
                </div>
            )}

            {isRunning && (
                <div>
                    <p className="pTimer">Cronómetro en marcha...</p>
                    <button className="buttonTimer" onClick={handleStop} style={{ marginTop: '10px', backgroundColor: '#dc3545' }}>
                        Detener cronómetro
                    </button>
                </div>
            )}

            {sala && <div style={{ marginTop: '20px', fontSize: '14px', color: '#FFD369' }}>Conectado a la sala: <strong>{sala}</strong> (Firebase RTDB)</div>}

            <div style={{ marginTop: '20px', fontSize: '12px', color: '#999', textAlign: 'center' }}> Cronómetro colaborativo con Firebase</div>
        </div>
    );
}