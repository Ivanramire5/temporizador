import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ref, set } from "firebase/database";
import { rtdb } from "../firebase/config";
import "../styles/alarm.css";

export default function AlarmScreen() {
    const { sala } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const sonido = new Audio("/alarm.mp3");
        sonido.loop = true;
        sonido.play();
        return () => sonido.pause();
    }, []);

    const detenerAlarma = async () => {
        const salaRef = ref(rtdb, `salas/${sala}/alarmaActiva`);
        await set(salaRef, false);
        navigate(`/home/${sala}`);
    };

    return (
        <div className="alarmPage">
        <h1 className="h1Alarma">Tiempo agotado</h1>
        <button className="botonAlarma" onClick={detenerAlarma}>
            Detener alarma
        </button>
        </div>
    );
}
