import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import TimerDisplay from "../components/TimerDisplay";
import { initializeApp } from "firebase/app";
import { getDatabase, ref, set, onValue } from "firebase/database";
import firebaseConfig from "../firebase/config";
import "../styles/home.css";

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);


export default function HomeScreen() {
    const { sala } = useParams();
    const navigate = useNavigate();

    const [timeLeft, setTimeLeft] = useState(0);
    const cronometroRef = ref(db, `salas/${sala}/cronometro`);

    useEffect(() => {
        const unsuscribe = onValue(cronometroRef, (snapshot) => {
            const data = snapshot.val();
            if (data && data.inicio && data.duracion) {
                const ahora = Math.floor(Date.now() / 1000);
                const tiempoRestante = data.inicio + data.duracion - ahora;
                if (tiempoRestante > 0) {
                    setTimeLeft(tiempoRestante);
                    const timeout = setTimeout(() => {
                        navigate(`/alarm/${sala}`);
                    }, tiempoRestante * 1000);
                    return () => clearTimeout(timeout);
                }
            }
        });
        return () => unsuscribe();
    }, []);

    return (
        <div className="pageHome">
            <h1 className="h1Home">Temporizador</h1>
            <TimerDisplay />
        </div>
    );
}
