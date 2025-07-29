import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, onValue, update } from "firebase/database";
import { rtdb } from "../firebase/config";
import TimerDisplay from "../components/TimerDisplay";
import "../styles/home.css";

export default function HomeScreen() {
  const { codigo } = useParams(); // Cambiado de 'sala' a 'codigo'
    const navigate = useNavigate();
    const [timeLeft, setTimeLeft] = useState(0);
    const timeoutIdRef = useRef(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        if (!codigo) {
        console.error('Código de sala no encontrado');
        navigate('/');
        return;
        }

        const salaRef = ref(rtdb, `salas/${codigo}`);
        const cronometroRef = ref(rtdb, `salas/${codigo}/cronometro`);

        const unsubscribeCronometro = onValue(cronometroRef, async (snapshot) => {
        const data = snapshot.val();
        if (!data || !data.inicio || !data.duracion) return;

        const ahora = Math.floor(Date.now() / 1000);
        const horaFin = data.inicio + data.duracion;
        const tiempoRestante = horaFin - ahora;

        if (tiempoRestante <= 0) {
            setTimeLeft(0);
            return;
        }

        setTimeLeft(tiempoRestante);

        timeoutIdRef.current = setTimeout(async () => {
            await update(salaRef, { alarmaActiva: true });
            navigate(`/alarm/${codigo}`);
        }, tiempoRestante * 1000);
        });

        setIsInitialized(true);
        return () => unsubscribeCronometro();
    }, [codigo, navigate]);

    useEffect(() => {
        return () => {
        if (timeoutIdRef.current) {
            clearTimeout(timeoutIdRef.current);
        }
        };
    }, []);

    if (!isInitialized) return <div>Cargando...</div>;

    return (
        <div className="pageHome">
        <h1 className="h1Home">Temporizador</h1>
        <TimerDisplay codigo={codigo} />
        <p>Tiempo restante: {timeLeft > 0 ? `${timeLeft}s` : "Sin iniciar"}</p>
        </div>
    );
}