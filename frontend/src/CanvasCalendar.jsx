import { useEffect, useState, useMemo, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { auth } from "./firebase";
import { signOut } from "firebase/auth";

const PALETTE = ["#e74c3c", "#3498db", "#27ae60", "#e91e63", "#f39c12", "#9b59b6", "#1abc9c", "#2ecc71"];

export default function CanvasCalendar({ setShowTokenForm, userToken }) {
  const [canvasEvents, setCanvasEvents] = useState([]);
  const [customEvents, setCustomEvents] = useState(
    JSON.parse(localStorage.getItem("customEvents") || "[]")
  );
  const [courses, setCourses] = useState([]);
  const [localId, setLocalId] = useState(900000);
  const [dark, setDark] = useState(false);
  const [deleteList, setDeleteList] = useState([]);
  const [customColor, setCustomColor] = useState(PALETTE[0]);

  const addDialogRef = useRef(null);
  const deleteDialogRef = useRef(null);

  const saveCustom = (list) =>
    localStorage.setItem("customEvents", JSON.stringify(list));

  useEffect(() => {
    if (!userToken) return;
    fetch("http://localhost:5007/courses", {
      headers: {
        Authorization: `Bearer ${userToken}`,
      },
    })
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) return;
        const courseMap = new Map();
        data.forEach((c, idx) =>
          courseMap.set(c.courseId, {
            id: c.courseId,
            name: c.courseName,
            color: PALETTE[idx % PALETTE.length],
          })
        );
        setCourses([...courseMap.values()]);

        const canvas = data.flatMap((c) =>
          c.assignments
            .filter((a) => a.dueDateIso)
            .map((a) => ({
              id: a.name + "|" + a.dueDateIso,
              title: a.name,
              start: a.dueDateIso,
              allDay: true,
              extendedProps: { courseId: c.courseId },
            }))
        );
        setCanvasEvents(canvas);
      })
      .catch(console.error);
  }, [userToken]);

  const fcEvents = useMemo(
    () =>
      [...canvasEvents, ...customEvents].map((e) => ({
        ...e,
        classNames: [`course-${e.extendedProps.courseId}`],
      })),
    [canvasEvents, customEvents]
  );

  const styleBlock = useMemo(() => {
    const courseColours = courses
      .map(
        (c) => `.fc .course-${c.id}{background:${c.color}!important;border-color:${c.color}!important}`
      )
      .join("");

    const toolbarFix = `.fc .fc-header-toolbar .fc-toolbar-chunk:first-child,.fc .fc-header-toolbar .fc-toolbar-chunk:last-child{flex:1 1 0;}`;

    const darkCSS = dark
      ? `body { background:#121212; color:#e0e0e0; }.fc { background:#1e1e1e; }.fc .fc-daygrid-day-number { color:#c6c6c6; }.fc .fc-button { background:#333; border-color:#555; color:#e0e0e0; }.legend-panel { background:rgba(40,40,40,0.85); }`
      : "";

    return courseColours + toolbarFix + darkCSS;
  }, [courses, dark]);

  function handleAddSubmit(e) {
    e.preventDefault();
    const f = e.target;
    const title = f.title.value.trim();
    const date = f.date.value;
    const cId = f.course.value;
    if (!title || !date || !cId) return;

    const newEvt = {
      id: "local-" + localId,
      title,
      start: date,
      allDay: true,
      extendedProps: { courseId: cId === "custom" ? "custom" + localId : parseInt(cId) },
    };

    if (cId === "custom") {
      setCourses((prev) => [
        ...prev,
        { id: newEvt.extendedProps.courseId, name: title, color: customColor },
      ]);
    }

    setCustomEvents((prev) => {
      const updated = [...prev, newEvt];
      saveCustom(updated);
      return updated;
    });
    setLocalId((id) => id + 1);
    addDialogRef.current.close();
    f.reset();
  }

  function handleDeletePickDate(e) {
    const date = e.target.value;
    if (!date) return;
    const list = customEvents.filter((ev) => ev.start.slice(0, 10) === date);
    setDeleteList(list);
  }

  function handleDeleteSubmit(e) {
    e.preventDefault();
    const selId = e.target.event.value;
    if (!selId) return;

    setCustomEvents((prev) => {
      const updated = prev.filter((ev) => ev.id !== selId);
      saveCustom(updated);
      return updated;
    });
    deleteDialogRef.current.close();
    e.target.reset();
    setDeleteList([]);
  }

  return (
    <div style={{ position: "relative", padding: "1rem" }}>
      <style>{styleBlock}</style>

      {/* Top Buttons */}
      <div className="flex gap-3 mb-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => addDialogRef.current.showModal()}>ADD</button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => deleteDialogRef.current.showModal()}>DELETE</button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => setDark((d) => !d)}>{dark ? "DAY" : "NIGHT"}</button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => { localStorage.removeItem("customEvents"); signOut(auth).then(() => window.location.reload()); }}>LOGOUT</button>
        <button className="bg-blue-500 text-white px-4 py-2 rounded" onClick={() => setShowTokenForm(true)}>EDIT TOKEN</button>
      </div>

      {/* ADD dialog */}
      <dialog ref={addDialogRef}>
        <form onSubmit={handleAddSubmit} style={{ display: "grid", gap: 8 }}>
          <h3>Add assignment</h3>
          <input name="title" placeholder="Assignment name" required />
          <input name="date" type="date" required />
          <select name="course" required onChange={(e) => setCustomColor(PALETTE[(localId + 1) % PALETTE.length])}>
            <option value="">choose course colour</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="custom">Custom Event</option>
          </select>
          <div style={{ textAlign: "right" }}>
            <button type="button" onClick={() => addDialogRef.current.close()}>Cancel</button>{" "}
            <button type="submit">Add</button>
          </div>
        </form>
      </dialog>

      {/* DELETE dialog */}
      <dialog ref={deleteDialogRef}>
        <form onSubmit={handleDeleteSubmit} style={{ display: "grid", gap: 8 }}>
          <h3>Delete assignment</h3>
          <input name="datePicker" type="date" onChange={handleDeletePickDate} required />
          <select name="event" required>
            <option value="">choose assignment</option>
            {deleteList.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>
          <div style={{ textAlign: "right" }}>
            <button type="button" onClick={() => deleteDialogRef.current.close()}>Cancel</button>{" "}
            <button type="submit">Remove</button>
          </div>
        </form>
      </dialog>

      {/* Legend */}
      <div className="legend-panel" style={{ position: "absolute", top: 4, right: 18, background: "rgba(255,255,255,0.85)", padding: "6px 10px", borderRadius: 4, fontSize: 12, lineHeight: 1.2, boxShadow: "0 0 4px rgba(0,0,0,0.15)" }}>
        {courses.map((c) => (
          <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{c.name}</span>
          </div>
        ))}
      </div>

      {/* Calendar */}
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        height="auto"
        events={fcEvents}
        eventDisplay="block"
        headerToolbar={{ left: "prev,next today", center: "title", right: "" }}
        dayMaxEventRows={4}
        eventContent={(arg) => (
          <div style={{ fontSize: 11, lineHeight: 1.15, wordBreak: "break-word" }}>{arg.event.title}</div>
        )}
      />
    </div>
  );
}
