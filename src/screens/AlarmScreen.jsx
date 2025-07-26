
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../styles/alarm.css";

export default function AlarmScren()
{
    const { sala } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        const sonido = new Audio("/alarm.mp3");
        sonido.loop = true;
        sonido.play();
        return () => sonido.pause();
    }, []);

    return(
        <div className="alarmPage">
            <h1 className="h1Alarma">Tiempo agotado</h1>
            <button className="botonAlarma" onClick={() => navigate(`/home/${sala}`)}>Detener alarma</button>
        </div>
    )
}