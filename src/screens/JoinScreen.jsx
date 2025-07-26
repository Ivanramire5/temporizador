
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/join.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';


export default function JoinScreen()
{
    const [codigo, setCodigo] = useState("");
    const navigate = useNavigate();

    const entrar = () =>
    {
        if (codigo.trim().length > 0) navigate(`/home/${codigo}`);
    };

    return(
        <div className = "pageDiv">
            <h1 className="h1Join">Temporizador</h1>
            <div className="formJoin">
                <input
                className = "inputJoin"
                value = {codigo}
                onChange = {(e) => setCodigo(e.target.value)}
                placeholder = "Codigo de sala"
            />
            <button className= "buttonJoin" onClick = {entrar}>
                <FontAwesomeIcon icon={faArrowRight} />
            </button> 
            </div>
            
        </div>
    );
}