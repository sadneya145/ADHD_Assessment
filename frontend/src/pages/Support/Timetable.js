import React, { useState, useEffect } from "react";
import Header from "../Header/Header";
import Footer from "../Footer/Footer";
import "./Timetable.css";

const Timetable = () => {

  const [task, setTask] = useState("");
  const [time, setTime] = useState("");
  const [tasks, setTasks] = useState([]);

  const speak = (text) => {
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 0.9;
    speech.pitch = 1.2;
    window.speechSynthesis.speak(speech);
  };

  const addTask = () => {

    if (!task || !time) {
      alert("Please enter task and time");
      return;
    }

    const now = new Date();
    const selectedTime = new Date();

    const [hours, minutes] = time.split(":");

    selectedTime.setHours(hours);
    selectedTime.setMinutes(minutes);
    selectedTime.setSeconds(0);

    // ❌ Prevent past time
    if (selectedTime < now) {
      alert("⛔ You cannot set a reminder for past time!");
      return;
    }

    // ✅ Ask confirmation
    const confirmAdd = window.confirm(
      `Do you want to add this task?\n\nTask: ${task}\nTime: ${time}`
    );

    if (!confirmAdd) return;

    const newTask = {
      name: task,
      time: time,
      done: false
    };

    setTasks([...tasks, newTask]);
    setTask("");
    setTime("");

    speak(`Task ${task} added for ${time}`);

  };

  const deleteTask = (index) => {

    const confirmDelete = window.confirm("Delete this task?");

    if (!confirmDelete) return;

    const updated = tasks.filter((_, i) => i !== index);
    setTasks(updated);

  };

  useEffect(() => {

    const interval = setInterval(() => {

      const now = new Date();
      const currentTime =
        now.getHours().toString().padStart(2, "0") +
        ":" +
        now.getMinutes().toString().padStart(2, "0");

      tasks.forEach((t, i) => {

        if (t.time === currentTime && !t.done) {

          alert(`⏰ Time for: ${t.name}`);
          speak(`Hey! It's time to ${t.name}`);

          const updated = [...tasks];
          updated[i].done = true;
          setTasks(updated);

        }

      });

    }, 60000);

    return () => clearInterval(interval);

  }, [tasks]);

  return (
    <div className="focus-page">

      <Header />

      <main className="focus-main">

        <section className="focus-card">

          <h1>📅 Daily Timetable</h1>

          <p>Plan your day and get reminders!</p>

          <div className="task-input">

            <input
              value={task}
              onChange={(e) => setTask(e.target.value)}
              placeholder="Enter task..."
            />

            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />

            <button onClick={addTask}>
              Add Task
            </button>

          </div>

          <ul className="task-list">

            {tasks.map((t, i) => (
              <li key={i}>

                <span>
                  ⏰ {t.time} — {t.name}
                </span>

                <button
                  className="delete-btn"
                  onClick={() => deleteTask(i)}
                >
                  ❌
                </button>

              </li>
            ))}

          </ul>

        </section>

      </main>

      <Footer />

    </div>
  );
};

export default Timetable;