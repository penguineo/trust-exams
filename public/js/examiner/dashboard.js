// Initialize Supabase client
const supabaseUrl = 'https://vmtqxhsafxfiszflkqey.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZtdHF4aHNhZnhmaXN6ZmxrcWV5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0ODgwNzEsImV4cCI6MjA1ODA2NDA3MX0.CTBZNb47zHQxj6ajKKxRwIF7EPf5b73rDJVJ3D5DrD8';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// DOM elements
const upcomingExamsContainer = document.getElementById('upcoming-exams-container');
const completedExamsContainer = document.getElementById('completed-exams-container');
const totalExamsElement = document.getElementById('total-exams');
const totalParticipantsElement = document.getElementById('total-participants');
const averageDurationElement = document.getElementById('average-duration');
const logoutBtn = document.getElementById('logout-btn');

// Check if user is logged in and is an examiner
document.addEventListener('DOMContentLoaded', async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    window.location.href = '/';
    return;
  }
  
  // Check if user is an examiner
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  
  if (!profile || profile.role !== 'examiner') {
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

// Fetch exams
async function fetchExams() {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    
    // Clear placeholder loaders
    upcomingExamsContainer.innerHTML = '';
    completedExamsContainer.innerHTML = '';
    
    // Fetch exams
    const { data: exams, error } = await supabase
      .from('exams')
      .select(`
        id,
        title,
        code,
        scheduled_at,
        duration,
        created_at
      `)
      .eq('examiner_id', session.user.id)
      .order('scheduled_at', { ascending: true });
    
    if (error) throw error;
    
    // Fetch participant counts for each exam
    const examIds = exams?.map(exam => exam.id) || [];
    let participantCountMap = new Map();
    
    if (examIds.length > 0) {
      for (const examId of examIds) {
        const { count, error } = await supabase
          .from('exam_participants')
          .select('*', { count: 'exact', head: true })
          .eq('exam_id', examId);
        
        if (error) throw error;
        participantCountMap.set(examId, count || 0);
      }
    }
    
    // Transform the data
    const now = new Date();
    const transformedExams = exams?.map(exam => ({
      id: exam.id,
      title: exam.title,
      code: exam.code,
      date: exam.scheduled_at,
      duration: exam.duration,
      participantsCount: participantCountMap.get(exam.id) || 0,
      status: new Date(exam.scheduled_at) > now ? 'upcoming' : 'completed'
    })) || [];
    
    // Separate exams by status
    const upcomingExams = transformedExams.filter(exam => exam.status === 'upcoming');
    const completedExams = transformedExams.filter(exam => exam.status === 'completed');
    
    // Update stats
    totalExamsElement.textContent = transformedExams.length;
    totalParticipantsElement.textContent = transformedExams.reduce((acc, exam) => acc + exam.participantsCount, 0);
    
    const avgDuration = transformedExams.length > 0
      ? Math.round(transformedExams.reduce((acc, exam) => acc + exam.duration, 0) / transformedExams.length)
      : 0;
    averageDurationElement.textContent = `${avgDuration} min`;
    
    // Render exams
    if (upcomingExams.length > 0) {
      renderExams(upcomingExams, upcomingExamsContainer);
    } else {
      upcomingExamsContainer.innerHTML = `
        <div class="col-span-full bg-white rounded-lg shadow-soft">
          <div class="p-8 text-center">
            <p class="text-gray-500 mb-4">No upcoming exams scheduled</p>
            <a href="/examiner/create-exam" class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md inline-flex items-center">
              <i class="fas fa-plus-circle mr-2"></i>
              <span>Create Your First Exam</span>
            </a>
          </div>
        </div>
      `;
    }
    
    if (completedExams.length > 0) {
      renderExams(completedExams, completedExamsContainer);
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
function renderExams(exams, container) {
  const template = document.getElementById('exam-card-template');
  
  exams.forEach(exam => {
    const clone = template.content.cloneNode(true);
    
    // Set exam data
    clone.querySelector('.exam-title').textContent = exam.title;
    
    const statusEl = clone.querySelector('.exam-status');
    if (exam.status === 'upcoming') {
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
    clone.querySelector('.exam-participants').textContent = `${exam.participantsCount} participants`;
    clone.querySelector('.exam-code').textContent = `Code: ${exam.code}`;
    
    const viewBtn = clone.querySelector('.exam-view-btn');
    viewBtn.href = `/examiner/exam/${exam.id}`;
    
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
