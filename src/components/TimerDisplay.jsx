import React, { useState, useEffect, useRef } from "react";
import Swal from 'sweetalert2';
import "../styles/timer.css";

export default function TimerDisplay() {
    const [inputValue, setInputValue] = useState("");
    const [time, setTime] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef(null);
    const audioRef = useRef(null);

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    const handleStart = () => {
        const parsed = parseInt(inputValue, 10);
        if (!isNaN(parsed) && parsed > 0) {
            setTime(parsed);
            setIsRunning(true);
        }
    };

    useEffect(() => {
        if (isRunning && time > 0) 
            {
                intervalRef.current = setInterval(() => 
                    {
                        setTime((prev) => prev - 1);
                    }, 1000);
            } 
            else if (time === 0 && isRunning) 
            {
                clearInterval(intervalRef.current);
                setIsRunning(false);

                audioRef.current = new Audio("/sounds/alarm.mp3");
                audioRef.current.loop = true;
                audioRef.current.play();

                Swal.fire({
                title: "Tiempo cumplido!!!!",
                icon: "warning",
                confirmButtonText: "Parar alarma",
                confirmButtonColor: "#393E46",
                background: "#EEEEEE",
                color: "black",
                customClass: {
                    popup: 'custom-swal'
                }
                }).then(() => {
                if (audioRef.current)
                {
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current = null;
                }
            });
        }

        return () => clearInterval(intervalRef.current);
    }, [isRunning, time]);

    return (
        <div className = "divTimer">
            <h1 className="h1Timer">{formatTime(time)}</h1>
            {!isRunning && (
                <div className = "formTimer">
                    <input
                    className = "inputTimer"
                        type="number"
                        placeholder="Tiempo en segundos"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        
                    />
                    <br />
                    <button className = "buttonTimer" onClick={handleStart}>
                        Iniciar cronómetro
                    </button>
                </div>
            )}
            {isRunning && <p className = "pTimer">Cronómetro en marcha...</p>}
        </div>
    );
}

