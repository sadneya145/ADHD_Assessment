import React, { useState } from "react";
import "./TalkingBuddy.css";

const TalkingBuddy = () => {

const [listening,setListening]=useState(false);
const [message,setMessage]=useState("");

const speak=(text)=>{
const speech=new SpeechSynthesisUtterance(text);
speech.rate=0.9;
speech.pitch=1.2;
speech.lang="en-US";
window.speechSynthesis.speak(speech);
};

const startListening=()=>{

const recognition=new window.webkitSpeechRecognition();
recognition.lang="en-US";
recognition.start();

setListening(true);

recognition.onresult=(event)=>{

const text=event.results[0][0].transcript;

setMessage(text);

respond(text);

};

recognition.onend=()=>setListening(false);

};

const respond=(text)=>{

let reply="";

if(text.includes("sad"))
reply="I'm sorry you're feeling sad. Let's try a breathing exercise.";

else if(text.includes("angry"))
reply="It's okay to feel angry. Let's take some calm breaths.";

else if(text.includes("focus"))
reply="Let's start a focus timer!";

else
reply="That's interesting! I'm here to help you focus and feel better.";

speak(reply);

};

return(

<div className="buddy-container">

<div className="buddy-character">
🤖
</div>

<h2>Hi! I'm your Focus Buddy</h2>

<p className="buddy-message">
{message || "Press the mic and talk to me!"}
</p>

<button
className="buddy-btn"
onClick={startListening}
>

{listening ? "Listening..." : "🎤 Talk to Buddy"}

</button>

</div>

);

};

export default TalkingBuddy;