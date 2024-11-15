import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import { getDatabase, ref, push, set, onValue } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-database.js";

const firebaseConfig = {
	apiKey: "AIzaSyDhe2tuvL3nzvvwfRmAVyhETMjeum1nku0",
  	authDomain: "gym-progress-7f973.firebaseapp.com",
  	projectId: "gym-progress-7f973",
  	storageBucket: "gym-progress-7f973.firebasestorage.app",
  	messagingSenderId: "67948681318",
  	appId: "1:67948681318:web:61ff0de1b35bdcfa3ff5a7"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

let routine = {};
let exerciseLog = [];

// Cargar datos al iniciar la página
loadRoutineFromFirebase();
loadExerciseLogFromFirebase();

// Añadir ejercicios a la rutina y guardarlos en Firebase
document.getElementById('add-to-routine').addEventListener('click', function() {
    const day = document.getElementById('day-select').value;
    const exercise = document.getElementById('routine-exercise').value;
    const sets = parseInt(document.getElementById('routine-sets').value);
    const repsMin = parseInt(document.getElementById('routine-reps-min').value);
    const repsMax = parseInt(document.getElementById('routine-reps-max').value);

    if (day && exercise && sets && repsMin && repsMax) {
        const newRoutine = { exercise, sets, repsMin, repsMax };

        if (editingDay !== null && editingIndex !== null) {
            // Editar la rutina existente
            if (Array.isArray(routine[editingDay])) {
                routine[editingDay][editingIndex] = newRoutine;
            } else {
                const exercisesArray = Object.values(routine[editingDay]);
                exercisesArray[editingIndex] = newRoutine;
                routine[editingDay] = exercisesArray;
            }

            // Actualizar en Firebase
            updateRoutineInFirebase(editingDay);

            // Restablecer el estado de edición
            editingDay = null;
            editingIndex = null;
            document.getElementById('add-to-routine').textContent = "Agregar";
        } else {
            // Agregar una nueva rutina
            if (!routine[day]) {
                routine[day] = [];
            } else if (!Array.isArray(routine[day])) {
                routine[day] = Object.values(routine[day]);
            }
            routine[day].push(newRoutine);
            saveRoutineToFirebase(day, newRoutine);
        }

        updateRoutineTable();
        updateExerciseSelect();
        clearRoutineInputs();
    } else {
        alert('Por favor, completa todos los campos');
    }
});

// Guardar la rutina en Firebase
function saveRoutineToFirebase(day, data) {
    const routineRef = ref(db, `routine/${day}`);
    const newRoutineRef = push(routineRef);
    set(newRoutineRef, data);
}

// Cargar la rutina desde Firebase
function loadRoutineFromFirebase() {
    const routineRef = ref(db, 'routine');
    onValue(routineRef, (snapshot) => {
        if (snapshot.exists()) {
            routine = snapshot.val() || {};
            updateRoutineTable();
            updateExerciseSelect();
        } else {
            console.log("No hay datos de rutina disponibles");
            routine = {};
            updateRoutineTable();
        }
    });
}

// Actualizar la tabla de rutina
function updateRoutineTable() {
    const routineBody = document.getElementById('routine-body');
    routineBody.innerHTML = '';

    // Iterar sobre los días en la rutina
    for (const [day, exercises] of Object.entries(routine)) {
        const exercisesArray = Array.isArray(exercises) ? exercises : Object.values(exercises);

        exercisesArray.forEach((ex, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${day}</td>
                <td>${ex.exercise}</td>
                <td>${ex.sets}</td>
                <td>${ex.repsMin}-${ex.repsMax} repeticiones</td>
                <td>
                    <button class="edit-btn">Editar</button>
                    <button class="delete-btn">Eliminar</button>
                </td>
            `;
            routineBody.appendChild(row);

            // Asignar el evento onclick al botón de edición
            const editButton = row.querySelector('.edit-btn');
            editButton.addEventListener('click', () => editRoutine(day, index));

            // Asignar el evento onclick al botón de eliminación
            const deleteButton = row.querySelector('.delete-btn');
            deleteButton.addEventListener('click', () => deleteRoutine(day, index));
        });
    }
}


let editingDay = null;
let editingIndex = null;

function editRoutine(day, index) {
    // Establecer los índices actuales para editar
    editingDay = day;
    editingIndex = index;

    const exerciseData = Array.isArray(routine[day]) ? routine[day][index] : Object.values(routine[day])[index];

    // Cargar los datos en el formulario
    document.getElementById('day-select').value = day;
    document.getElementById('routine-exercise').value = exerciseData.exercise;
    document.getElementById('routine-sets').value = exerciseData.sets;
    document.getElementById('routine-reps-min').value = exerciseData.repsMin;
    document.getElementById('routine-reps-max').value = exerciseData.repsMax;

    // Cambiar el botón "Agregar" a "Guardar"
    document.getElementById('add-to-routine').textContent = "Guardar";
}

function deleteRoutine(day, index) {
    // Confirmar si el usuario realmente quiere eliminar la rutina
    const confirmDelete = confirm("¿Estás seguro de que deseas eliminar esta rutina?");
    if (!confirmDelete) return;

    // Eliminar la rutina del estado local
    if (Array.isArray(routine[day])) {
        routine[day].splice(index, 1);
    } else {
        const exercisesArray = Object.values(routine[day]);
        exercisesArray.splice(index, 1);
        routine[day] = exercisesArray;
    }

    // Si la rutina está vacía, elimina la clave del día
    if (routine[day].length === 0) {
        delete routine[day];
    }

    // Actualizar en Firebase
    updateRoutineInFirebase(day);

    // Actualizar la tabla y el selector de ejercicios
    updateRoutineTable();
    updateExerciseSelect();
}

function updateRoutineInFirebase(day) {
    const routineRef = ref(db, `routine/${day}`);
    const exercisesArray = Array.isArray(routine[day]) ? routine[day] : Object.values(routine[day]);

    if (exercisesArray.length > 0) {
        // Actualizar la rutina en Firebase si hay ejercicios
        set(routineRef, exercisesArray);
    } else {
        // Eliminar la referencia en Firebase si no hay ejercicios
        set(routineRef, null);
    }
}

// Actualizar el selector de ejercicios
function updateExerciseSelect() {
    const select = document.getElementById('exercise-select');
    select.innerHTML = '<option value="">Selecciona un ejercicio</option>';

    // Iterar sobre los días en la rutina para llenar el selector
    for (const exercises of Object.values(routine)) {
        const exercisesArray = Array.isArray(exercises) ? exercises : Object.values(exercises);

        exercisesArray.forEach(ex => {
            if (![...select.options].some(option => option.value === ex.exercise)) {
                const option = document.createElement('option');
                option.value = ex.exercise;
                option.textContent = ex.exercise;
                select.appendChild(option);
            }
        });
    }

    // Actualizar el selector de series cuando se cambie el ejercicio
    select.addEventListener('change', updateSeriesSelect);
}

document.getElementById('exercise-select').addEventListener('change', updateSeriesSelect);

function updateSeriesSelect() {
    const exercise = document.getElementById('exercise-select').value;
    const seriesSelect = document.getElementById('series-select');
    seriesSelect.innerHTML = '<option value="">Selecciona una serie</option>';

    if (exercise) {
        // Buscar el ejercicio en la rutina y obtener la cantidad de series
        for (const exercises of Object.values(routine)) {
            const exercisesArray = Array.isArray(exercises) ? exercises : Object.values(exercises);

            const selectedExercise = exercisesArray.find(ex => ex.exercise === exercise);
            if (selectedExercise) {
                for (let i = 1; i <= selectedExercise.sets; i++) {
                    const option = document.createElement('option');
                    option.value = i;
                    option.textContent = `Serie ${i}`;
                    seriesSelect.appendChild(option);
                }
                break;
            }
        }
    }
}

// Registrar el progreso del entrenamiento y guardarlo en Firebase
document.getElementById('add-log').addEventListener('click', function () {
    const exercise = document.getElementById('exercise-select').value;
    const series = parseInt(document.getElementById('series-select').value);
    const weight = parseInt(document.getElementById('weight').value);
    const reps = parseInt(document.getElementById('reps-done').value);
    const date = document.getElementById('exercise-date').value;

    if (exercise && series && weight && reps && date) {
        const existingEntry = findExistingEntry(exercise, series, date);

        let weightChange = 0;
        let repsChange = 0;

        // Si ya existe un registro para el mismo día y serie, actualízalo
        if (existingEntry) {
            existingEntry.weight = weight;
            existingEntry.reps = reps;

            const previousEntry = findLastEntryForSeries(exercise, series, date);
            if (previousEntry) {
                existingEntry.weightChange = weight - previousEntry.weight;
                existingEntry.repsChange = reps - previousEntry.reps;
            } else {
                existingEntry.weightChange = 0;
                existingEntry.repsChange = 0;
            }

            updateExerciseLogInFirebase(existingEntry.id, existingEntry);
        } else {
            // Si no existe, crea un nuevo registro
            const previousEntry = findLastEntryForSeries(exercise, series, date);
            if (previousEntry) {
                weightChange = weight - previousEntry.weight;
                repsChange = reps - previousEntry.reps;
            }
            const newEntry = { exercise, series, weight, reps, date, weightChange, repsChange };
            saveExerciseLogToFirebase(newEntry);
        }

        updateLogTable();
        clearLogInputs();
    } else {
        alert('Por favor, completa todos los campos');
    }
});


function findExistingEntry(exercise, series, date) {
    return exerciseLog.find(entry => entry.exercise === exercise && entry.series === series && entry.date === date);
}

function findLastEntryForExercise(exercise, currentDate) {
    const previousEntries = exerciseLog
        .filter(entry => entry.exercise === exercise && entry.date < currentDate)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    return previousEntries.length > 0 ? previousEntries[0] : null;
}

function recalculateChangesForDate(exercise, date) {
    // Filtrar los registros para el mismo ejercicio y fecha actual o posterior
    const filteredEntries = exerciseLog
        .filter(entry => entry.exercise === exercise && entry.date >= date)
        .sort((a, b) => new Date(a.date) - new Date(b.date) || a.series - b.series);

    // Recalcular cambios dinámicamente
    for (let i = 0; i < filteredEntries.length; i++) {
        const currentEntry = filteredEntries[i];
        const previousEntry = i > 0 ? filteredEntries[i - 1] : findLastEntryForExercise(exercise, currentEntry.date);

        if (previousEntry && previousEntry.date < currentEntry.date) {
            currentEntry.weightChange = currentEntry.weight - previousEntry.weight;
            currentEntry.repsChange = currentEntry.reps - previousEntry.reps;
        } else {
            currentEntry.weightChange = 0;
            currentEntry.repsChange = 0;
        }

        // Actualizar en Firebase
        updateExerciseLogInFirebase(currentEntry.id, currentEntry);
    }
}

// Actualizar un registro existente en Firebase
function updateExerciseLogInFirebase(id, entry) {
    const entryRef = ref(db, `exerciseLog/${id}`);
    set(entryRef, entry);
}

// Guardar el registro de entrenamiento en Firebase
function saveExerciseLogToFirebase(entry) {
    const logRef = ref(db, 'exerciseLog');
    const newLogRef = push(logRef);
    entry.id = newLogRef.key;
    set(newLogRef, entry);
}

// Función para cargar el registro de entrenamiento desde Firebase
function loadExerciseLogFromFirebase() {
    const logRef = ref(db, 'exerciseLog');
    onValue(logRef, (snapshot) => {
        exerciseLog = [];
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const entry = childSnapshot.val();
                entry.id = childSnapshot.key;
                exerciseLog.push(entry);
            });
        }
        // Ordenar por fecha y series al cargar los datos
        exerciseLog.sort((a, b) => new Date(a.date) - new Date(b.date) || a.series - b.series);
        updateLogTable();
    });
}


// Actualizar la tabla de registros agrupando por fecha
function updateLogTable() {
    const logBody = document.getElementById('log-body');
    logBody.innerHTML = '';

    const groupedByDate = exerciseLog.reduce((acc, entry) => {
        if (!acc[entry.date]) acc[entry.date] = [];
        acc[entry.date].push(entry);
        return acc;
    }, {});

    for (const [date, entries] of Object.entries(groupedByDate)) {
		const dateRow = document.createElement('tr');
        dateRow.innerHTML = `<td colspan="8"><strong>Fecha: ${date}</strong></td>`;
        logBody.appendChild(dateRow);

        entries.sort((a, b) => a.series - b.series).forEach(entry => {
			const dayName = new Date(entry.date).toLocaleDateString('es-ES', { weekday: 'long' });
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${entry.exercise}</td>
                <td>${entry.series}</td>
                <td>${entry.weight}</td>
                <td>${entry.reps}</td>
                <td>${dayName.toLocaleUpperCase()}</td>
                <td>${formatChange(entry.weightChange)}</td>
                <td>${formatChange(entry.repsChange)}</td>
                <td><button class="delete-btn">Eliminar</button></td>
            `;
            logBody.appendChild(row);

            // Asignar el evento onclick al botón de eliminación
            const deleteButton = row.querySelector('.delete-btn');
            deleteButton.addEventListener('click', () => deleteExerciseLog(entry.id));
        });
    }
}

function findLastEntryForSeries(exercise, series, currentDate) {
    // Filtrar los registros para el mismo ejercicio y serie antes del día actual
    const previousEntries = exerciseLog
        .filter(entry => entry.exercise === exercise && entry.series === series && entry.date < currentDate)
        .sort((a, b) => new Date(b.date) - new Date(a.date)); // Ordenar por fecha descendente

    // Devolver el último registro encontrado (el día anterior)
    return previousEntries.length > 0 ? previousEntries[0] : null;
}

function deleteExerciseLog(id) {
    const confirmDelete = confirm("¿Estás seguro de que deseas eliminar este registro?");
    if (!confirmDelete) return;

    // Eliminar el registro del estado local
    exerciseLog = exerciseLog.filter(entry => entry.id !== id);

    // Eliminar el registro de Firebase
    const entryRef = ref(db, `exerciseLog/${id}`);
    set(entryRef, null);

    // Actualizar la tabla después de eliminar
    updateLogTable();

    // Recalcular los cambios para los registros restantes
    recalculateAllChanges();
}

function recalculateAllChanges() {
    const groupedEntries = exerciseLog.reduce((acc, entry) => {
        if (!acc[entry.exercise]) acc[entry.exercise] = [];
        acc[entry.exercise].push(entry);
        return acc;
    }, {});

    for (const entries of Object.values(groupedEntries)) {
        entries.sort((a, b) => a.series - b.series);

        for (let i = 0; i < entries.length; i++) {
            const currentEntry = entries[i];
            const previousEntry = i > 0 ? entries[i - 1] : null;

            if (previousEntry) {
                currentEntry.weightChange = currentEntry.weight - previousEntry.weight;
                currentEntry.repsChange = currentEntry.reps - previousEntry.reps;
            } else {
                currentEntry.weightChange = 0;
                currentEntry.repsChange = 0;
            }

            // Actualizar en Firebase
            updateExerciseLogInFirebase(currentEntry.id, currentEntry);
        }
    }

    // Actualizar la tabla después de recalcular
    updateLogTable();
}


// Función para formatear los cambios en peso y repeticiones
function formatChange(change) {
    if (change > 0) return `+${change}`;
    if (change < 0) return `${change}`;
    return '= 0';
}

// Limpiar los campos del formulario de registro de entrenamiento
function clearLogInputs() {
    document.getElementById('series-select').value = '';
    document.getElementById('weight').value = '';
    document.getElementById('reps-done').value = '';
    document.getElementById('exercise-date').value = '';
}

// Limpiar los campos del formulario de rutina
function clearRoutineInputs() {
    document.getElementById('day-select').value = '';
    document.getElementById('routine-exercise').value = '';
    document.getElementById('routine-sets').value = '';
    document.getElementById('routine-reps-min').value = '';
    document.getElementById('routine-reps-max').value = '';
    document.getElementById('add-to-routine').textContent = "Agregar";
}
