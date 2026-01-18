// app.js
class CounterModel {
  #value;

  constructor(initialValue = 0) {
    if (!Number.isInteger(initialValue)) throw new TypeError("initialValue must be an integer");
    this.#value = initialValue;
  }

  get value() {
    return this.#value;
  }

  increment() {
    this.#value += 1;
    return this.#value;
  }

  decrement() {
    this.#value -= 1;
    return this.#value;
  }

  reset() {
    this.#value = 0;
    return this.#value;
  }
}

class NotesModel {
  #notes;

  constructor(initialNotes = []) {
    if (!Array.isArray(initialNotes)) throw new TypeError("initialNotes must be an array");
    this.#notes = initialNotes.map((n) => NotesModel.#sanitize(n)).filter((n) => n.length > 0);
  }

  static #sanitize(input) {
    return String(input ?? "").trim().replace(/\s+/g, " ");
  }

  list() {
    return [...this.#notes];
  }

  add(noteText) {
    const v = NotesModel.#sanitize(noteText);
    if (v.length === 0) return null;
    this.#notes.push(v);
    return v;
  }

  removeAt(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.#notes.length) return false;
    this.#notes.splice(index, 1);
    return true;
  }

  clear() {
    this.#notes = [];
  }
}

class Store {
  constructor(key, fallbackValue) {
    if (typeof key !== "string" || key.trim().length === 0) throw new TypeError("key must be a non-empty string");
    this.key = key;
    this.fallbackValue = fallbackValue;
  }

  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw === null) return structuredClone(this.fallbackValue);
      return JSON.parse(raw);
    } catch {
      return structuredClone(this.fallbackValue);
    }
  }

  save(value) {
    localStorage.setItem(this.key, JSON.stringify(value));
  }
}

class AppUI {
  constructor(root) {
    if (!(root instanceof HTMLElement)) throw new TypeError("root must be an HTMLElement");
    this.root = root;

    this.countEl = this.#req("#count");
    this.statusEl = this.#req("#status");
    this.incBtn = this.#req("#increment");
    this.decBtn = this.#req("#decrement");
    this.resetBtn = this.#req("#reset");

    this.noteForm = this.#req("#noteForm");
    this.noteInput = this.#req("#noteInput");
    this.noteList = this.#req("#noteList");
  }

  #req(selector) {
    const el = this.root.querySelector(selector) ?? document.querySelector(selector);
    if (!el) throw new Error(`Missing required element: ${selector}`);
    return el;
  }

  bindCounter({ onIncrement, onDecrement, onReset }) {
    this.incBtn.addEventListener("click", () => onIncrement());
    this.decBtn.addEventListener("click", () => onDecrement());
    this.resetBtn.addEventListener("click", () => onReset());
  }

  bindNotes({ onAdd, onRemove }) {
    this.noteForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = this.noteInput.value;
      const added = onAdd(text);
      if (added) this.noteInput.value = "";
      this.noteInput.focus();
    });

    this.noteList.addEventListener("click", (e) => {
      const target = e.target;
      if (!(target instanceof Element)) return;
      const btn = target.closest("[data-action='remove']");
      if (!btn) return;

      const idxStr = btn.getAttribute("data-index");
      const idx = idxStr === null ? NaN : Number(idxStr);
      if (!Number.isInteger(idx)) return;

      onRemove(idx);
    });
  }

  renderCounter(value) {
    this.countEl.textContent = String(value);
  }

  renderStatus(text) {
    this.statusEl.textContent = text;
  }

  renderNotes(notes) {
    this.noteList.replaceChildren(
      ...notes.map((text, index) => {
        const li = document.createElement("li");
        li.className = "list-item";

        const span = document.createElement("span");
        span.className = "list-text";
        span.textContent = text;

        const btn = document.createElement("button");
        btn.className = "icon-btn";
        btn.type = "button";
        btn.setAttribute("data-action", "remove");
        btn.setAttribute("data-index", String(index));
        btn.setAttribute("aria-label", `Remove note ${index + 1}`);
        btn.textContent = "Remove";

        li.append(span, btn);
        return li;
      })
    );
  }
}

class AppController {
  constructor({ ui, counter, notes, notesStore, counterStore }) {
    this.ui = ui;
    this.counter = counter;
    this.notes = notes;
    this.notesStore = notesStore;
    this.counterStore = counterStore;
  }

  start() {
    this.ui.bindCounter({
      onIncrement: () => this.#updateCounter("inc"),
      onDecrement: () => this.#updateCounter("dec"),
      onReset: () => this.#updateCounter("reset"),
    });

    this.ui.bindNotes({
      onAdd: (text) => this.#addNote(text),
      onRemove: (index) => this.#removeNote(index),
    });

    this.ui.renderCounter(this.counter.value);
    this.ui.renderNotes(this.notes.list());
    this.ui.renderStatus("Ready");
  }

  #updateCounter(kind) {
    let v;
    if (kind === "inc") v = this.counter.increment();
    else if (kind === "dec") v = this.counter.decrement();
    else v = this.counter.reset();

    this.counterStore.save({ value: v });

    this.ui.renderCounter(v);
    this.ui.renderStatus(`Counter: ${v}`);
  }

  #addNote(text) {
    const added = this.notes.add(text);
    if (!added) {
      this.ui.renderStatus("Note was empty");
      return null;
    }

    const list = this.notes.list();
    this.notesStore.save({ notes: list });

    this.ui.renderNotes(list);
    this.ui.renderStatus("Note added");
    return added;
  }

  #removeNote(index) {
    const ok = this.notes.removeAt(index);
    if (!ok) return;

    const list = this.notes.list();
    this.notesStore.save({ notes: list });

    this.ui.renderNotes(list);
    this.ui.renderStatus("Note removed");
  }
}

function bootstrap() {
  const root = document.getElementById("app");
  if (!root) throw new Error("Missing #app root element");

  const counterStore = new Store("static-app.counter.v1", { value: 0 });
  const notesStore = new Store("static-app.notes.v1", { notes: [] });

  const counterState = counterStore.load();
  const notesState = notesStore.load();

  const initialCounterValue =
    counterState && typeof counterState === "object" && Number.isInteger(counterState.value)
      ? counterState.value
      : 0;

  const initialNotes =
    notesState && typeof notesState === "object" && Array.isArray(notesState.notes)
      ? notesState.notes
      : [];

  const ui = new AppUI(root);
  const counter = new CounterModel(initialCounterValue);
  const notes = new NotesModel(initialNotes);

  const controller = new AppController({ ui, counter, notes, notesStore, counterStore });
  controller.start();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
