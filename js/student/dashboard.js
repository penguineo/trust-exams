// Initialize Supabase client
const supabaseUrl = 'https://vmtqxhsafxfiszflkqey.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdHF4aHNhZnhmaXN6ZmxrcWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0ODgwNzEsImV4cCI6MjA1ODA2NDA3MX0.CTBZNb47zHQxj6ajKKxRwIF7EPf5b73rDJVJ3D5DrD8';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const upcomingExamsContainer = document.getElementById('upcoming-exams-container');
const completedExamsContainer = document.getElementById('completed-exams-container');
const examCodeInput = document.getElementById('exam-code-input');
const joinExamBtn = document.getElementById('join-exam-btn');
const logoutBtn = document.getElementById('logout-btn');

// Check if user is logged in and is a student
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = '/';
    return;
  }
  
  // Check if user is a student
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  
  if (!profile || profile.role !== 'student') {
    window.location.href = '/';
    return;
  }
  
  // Fetch exams
  fetchExams();
});

// Logout
logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut();
  window.location.href = '/';
});

// Join exam
joinExamBtn.addEventListener('click', async () => {
  const examCode = examCodeInput.value.trim();
  
  if (!examCode) {
    showToast('Please enter an exam code', 'error');
    return;
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // Find exam by code
    const { data: exams, error } = await supabase
      .from('exams')
      .select('id, scheduled_at')
      .eq('code', examCode)
      .single();
    
    if (error) {
      showToast('Invalid exam code', 'error');
      return;
    }
    
    // Check if exam is in the future
    const examDate = new Date(exams.scheduled_at);
    const now = new Date();
    
    if (examDate < now) {
      showToast('This exam has already started or ended', 'error');
      return;
    }
    
    // Check if already registered for this exam
    const { data: existingParticipant, error: participantError } = await supabase
      .from('exam_participants')
      .select('id')
      .eq('exam_id', exams.id)
      .eq('student_id', session.user.id)
      .single();
    
    if (existingParticipant) {
      showToast('You are already registered for this exam', 'info');
      return;
    }
    
    // Register for the exam
    const { error: insertError } = await supabase
      .from('exam_participants')
      .insert({
        exam_id: exams.id,
        student_id: session.user.id,
        status: 'pending'
      });
    
    if (insertError) throw insertError;
    
    showToast('Successfully joined the exam', 'success');
    
    // Refresh exams
    fetchExams();
    
    // Clear input
    examCodeInput.value = '';
    
  } catch (error) {
    console.error('Error joining exam:', error);
    showToast('Failed to join exam', 'error');
  }
});

// Fetch exams
async function fetchExams() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // Clear placeholder loaders
    upcomingExamsContainer.innerHTML = '';
    completedExamsContainer.innerHTML = '';
    
    // Get exams the student is registered for
    const { data: participants, error: participantsError } = await supabase
      .from('exam_participants')
      .select('exam_id')
      .eq('student_id', session.user.id);
    
    if (participantsError) throw participantsError;
    
    // No exams yet
    if (!participants || participants.length === 0) {
      upcomingExamsContainer.innerHTML = `
        <div class="col-span-full bg-white rounded-lg shadow-soft">
          <div class="p-8 text-center">
            <p class="text-gray-500 mb-4">You haven't joined any exams yet</p>
            <p class="text-sm text-gray-600">Use the exam code provided by your examiner to join an exam</p>
          </div>
        </div>
      `;
      
      completedExamsContainer.innerHTML = `
        <div class="col-span-full bg-white rounded-lg shadow-soft">
          <div class="p-6 text-center">
            <p class="text-gray-500">No completed exams yet</p>
          </div>
        </div>
      `;
      
      return;
    }
    
    const examIds = participants.map(p => p.exam_id);
    
    // Fetch exams
    const { data: exams, error: examsError } = await supabase
      .from('exams')
      .select(`
        id,
        title,
        scheduled_at,
        duration
      `)
      .in('id', examIds)
      .order('scheduled_at', { ascending: true });
    
    if (examsError) throw examsError;
    
    // Transform the data
    const now = new Date();
    const transformedExams = exams?.map(exam => ({
      id: exam.id,
      title: exam.title,
      date: exam.scheduled_at,
      duration: exam.duration,
      status: new Date(exam.scheduled_at) > now ? 'upcoming' : 'completed'
    })) || [];
    
    // Separate exams by status
    const upcomingExams = transformedExams.filter(exam => exam.status === 'upcoming');
    const completedExams = transformedExams.filter(exam => exam.status === 'completed');
    
    // Render exams
    if (upcomingExams.length > 0) {
      renderExams(upcomingExams, upcomingExamsContainer, 'upcoming');
    } else {
      upcomingExamsContainer.innerHTML = `
        <div class="col-span-full bg-white rounded-lg shadow-soft">
          <div class="p-8 text-center">
            <p class="text-gray-500 mb-4">No upcoming exams scheduled</p>
            <p class="text-sm text-gray-600">Use the exam code provided by your examiner to join an exam</p>
          </div>
        </div>
      `;
    }
    
    if (completedExams.length > 0) {
      renderExams(completedExams, completedExamsContainer, 'completed');
    } else {
      completedExamsContainer.innerHTML = `
        <div class="col-span-full bg-white rounded-lg shadow-soft">
          <div class="p-6 text-center">
            <p class="text-gray-500">No completed exams yet</p>
          </div>
        </div>
      `;
    }
  } catch (error) {
    console.error('Error fetching exams:', error);
    showToast('Failed to load exams', 'error');
  }
}

// Render exams
function renderExams(exams, container, type) {
  const template = document.getElementById('exam-card-template');
  
  exams.forEach(exam => {
    const clone = template.content.cloneNode(true);
    
    // Set exam data
    clone.querySelector('.exam-title').textContent = exam.title;
    
    const statusEl = clone.querySelector('.exam-status');
    if (type === 'upcoming') {
      statusEl.textContent = 'Upcoming';
      statusEl.classList.add('bg-green-100', 'text-green-800');
    } else {
      statusEl.textContent = 'Completed';
      statusEl.classList.add('bg-gray-100', 'text-gray-800');
    }
    
    const dateObj = new Date(exam.date);
    clone.querySelector('.exam-date').textContent = dateObj.toLocaleDateString('en-US', { 
      weekday: 'short', 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    clone.querySelector('.exam-duration').textContent = `${exam.duration} minutes`;
    
    const actionBtn = clone.querySelector('.exam-action-btn');
    if (type === 'upcoming') {
      actionBtn.textContent = 'View Details';
      actionBtn.href = `/student/exam/${exam.id}`;
    } else {
      actionBtn.textContent = 'View Results';
      actionBtn.href = `/student/results/${exam.id}`;
    }
    
    container.appendChild(clone);
  });
}

// Show toast notification
function showToast(message, type = 'success') {
  // Remove existing toast if any
  const existingToast = document.querySelector('.toast');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Create new toast
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  
  document.body.appendChild(toast);
  
  // Show toast
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  // Hide toast after 3 seconds
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 3000);
}
