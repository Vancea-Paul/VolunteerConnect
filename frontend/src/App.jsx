import { useEffect, useState } from 'react'
import logo from './assets/sigla-01.png'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080'

const iconPaths = {
  chat: 'M4 6h16v8H7l-3 3V6z',
  projects: 'M4 4h7v7H4V4zm9 0h7v7h-7V4zM4 13h7v7H4v-7zm9 0h7v7h-7v-7z',
  tasks: 'M4 7h10M4 12h16M4 17h12',
  calendar: 'M7 4v3M17 4v3M4 9h16M6 12h4M6 16h4M12 12h4M12 16h4',
  stats: 'M5 19V9m5 10V5m5 14v-7m5 7v-4',
  support: 'M12 4a6 6 0 016 6v3a6 6 0 01-12 0V10a6 6 0 016-6z',
  volunteers: 'M6 7a3 3 0 116 0 3 3 0 01-6 0zm9 3a3 3 0 113 3 3 3 0 01-3-3zM4 18a4 4 0 018 0M14 18a4 4 0 018 0',
  recruitment: 'M6 7a3 3 0 116 0 3 3 0 01-6 0zm9 3a3 3 0 113 3 3 3 0 01-3-3zM4 18a4 4 0 018 0M14 18a4 4 0 018 0',
  bell: 'M12 4a4 4 0 014 4v3l2 3H6l2-3V8a4 4 0 014-4zM9 17a3 3 0 006 0',
  menu: 'M4 7h16M4 12h16M4 17h16',
  collapse: 'M9 6l-3 3 3 3M15 6l3 3-3 3',
}

const Icon = ({ name }) => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d={iconPaths[name]} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

function App() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [status, setStatus] = useState({ state: 'idle', message: '' })
  const [token, setToken] = useState('')
  const [user, setUser] = useState(null)
  const [createForm, setCreateForm] = useState({
    username: '',
    email: '',
    role: 'VOLUNTEER',
  })
  const [createStatus, setCreateStatus] = useState({ state: 'idle', message: '' })
  const [generatedPassword, setGeneratedPassword] = useState('')
  const [activeView, setActiveView] = useState('home')
  const [volunteers, setVolunteers] = useState([])
  const [mentors, setMentors] = useState([])
  const [volunteerStatus, setVolunteerStatus] = useState({ state: 'idle', message: '' })
  const [profile, setProfile] = useState(null)
  const [profileStatus, setProfileStatus] = useState({ state: 'idle', message: '' })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })
  const [passwordStatus, setPasswordStatus] = useState({ state: 'idle', message: '' })
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setStatus({ state: 'loading', message: '' })
    setToken('')

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Login failed.')
      }

      const data = await response.json()
      const normalized = form.username.trim() || 'volunteer'
      const resolvedRole = (data.role ?? 'VOLUNTEER').toUpperCase()
      const roleLabel = `${resolvedRole.slice(0, 1)}${resolvedRole.slice(1).toLowerCase()}`
      setUser({ name: data.username ?? normalized, role: resolvedRole, roleLabel })
      setCreateForm((prev) => ({
        ...prev,
        role: resolvedRole === 'ADMIN' ? 'MENTOR' : 'VOLUNTEER',
      }))
      setToken(data.token ?? '')
      setStatus({ state: 'success', message: 'Login successful.' })
    } catch (error) {
      setStatus({ state: 'error', message: error.message || 'Login failed.' })
    }
  }

  const isLoading = status.state === 'loading'
  const isAdmin = user?.role === 'ADMIN'
  const isMentor = user?.role === 'MENTOR'
  const isVolunteer = user?.role === 'VOLUNTEER'

  useEffect(() => {
    if (!user || !(isAdmin || isMentor) || activeView !== 'volunteers') {
      return
    }

    const controller = new AbortController()
    const load = async () => {
      setVolunteerStatus({ state: 'loading', message: '' })
      try {
        const volunteersRequest = fetch(
          `${API_BASE_URL}/api/users/volunteers?requesterUsername=${encodeURIComponent(user.name)}`,
          { signal: controller.signal }
        )
        const mentorsRequest = isAdmin
          ? fetch(
              `${API_BASE_URL}/api/users/mentors?requesterUsername=${encodeURIComponent(user.name)}`,
              { signal: controller.signal }
            )
          : Promise.resolve(null)

        const [volunteersResponse, mentorsResponse] = await Promise.all([volunteersRequest, mentorsRequest])

        if (!volunteersResponse.ok) {
          const message = await volunteersResponse.text()
          throw new Error(message || 'Failed to load volunteers.')
        }
        const volunteerData = await volunteersResponse.json()
        setVolunteers(volunteerData)

        if (isAdmin) {
          if (!mentorsResponse || !mentorsResponse.ok) {
            const message = mentorsResponse ? await mentorsResponse.text() : ''
            throw new Error(message || 'Failed to load mentors.')
          }
          const mentorData = await mentorsResponse.json()
          setMentors(mentorData)
        } else {
          setMentors([])
        }

        setVolunteerStatus({ state: 'success', message: '' })
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }
        setVolunteerStatus({ state: 'error', message: error.message || 'Failed to load volunteers.' })
      }
    }

    load()
    return () => controller.abort()
  }, [activeView, isAdmin, isMentor, user])

  useEffect(() => {
    if (!user || activeView !== 'profile') {
      return
    }

    const controller = new AbortController()
    const loadProfile = async () => {
      setProfileStatus({ state: 'loading', message: '' })
      try {
        const response = await fetch(
          `${API_BASE_URL}/api/users/profile?username=${encodeURIComponent(user.name)}`,
          { signal: controller.signal }
        )
        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || 'Failed to load profile.')
        }
        const data = await response.json()
        setProfile(data)
        setProfileStatus({ state: 'success', message: '' })
      } catch (error) {
        if (error.name === 'AbortError') {
          return
        }
        setProfileStatus({ state: 'error', message: error.message || 'Failed to load profile.' })
      }
    }

    loadProfile()
    return () => controller.abort()
  }, [activeView, user])

  const handleCreateChange = (event) => {
    const { name, value } = event.target
    setCreateForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleCreateSubmit = async (event) => {
    event.preventDefault()
    setCreateStatus({ state: 'loading', message: '' })
    setGeneratedPassword('')

    try {
      const endpoint = createForm.role === 'ADMIN' ? '/api/users/admin' : '/api/users'
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requesterUsername: user.name,
          username: createForm.username.trim(),
          email: createForm.email.trim(),
          role: createForm.role,
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'User creation failed.')
      }

      const data = await response.json()
      setGeneratedPassword(data.generatedPassword ?? '')
      setCreateForm((prev) => ({ ...prev, username: '', email: '' }))
      setCreateStatus({ state: 'success', message: 'Account created.' })
    } catch (error) {
      setCreateStatus({ state: 'error', message: error.message || 'User creation failed.' })
    }
  }

  const handlePasswordFormChange = (event) => {
    const { name, value } = event.target
    setPasswordForm((prev) => ({ ...prev, [name]: value }))
  }

  const handlePasswordChangeSubmit = async (event) => {
    event.preventDefault()
    setPasswordStatus({ state: 'loading', message: '' })

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordStatus({ state: 'error', message: 'New password and confirmation do not match.' })
      return
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/users/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: user.name,
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Password change failed.')
      }

      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setPasswordStatus({ state: 'success', message: 'Password changed successfully.' })
    } catch (error) {
      setPasswordStatus({ state: 'error', message: error.message || 'Password change failed.' })
    }
  }

  const deleteManagedUser = async (managedUser, roleName) => {
    if (!window.confirm(`Delete ${managedUser.username}?`)) {
      return
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/users/${encodeURIComponent(managedUser.username)}?requesterUsername=${encodeURIComponent(user.name)}`,
        { method: 'DELETE' }
      )
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Delete failed.')
      }

      if (roleName === 'MENTOR') {
        setMentors((prev) => prev.filter((entry) => entry.id !== managedUser.id))
      } else {
        setVolunteers((prev) => prev.filter((entry) => entry.id !== managedUser.id))
      }
    } catch (error) {
      setVolunteerStatus({
        state: 'error',
        message: error.message || 'Delete failed.',
      })
    }
  }

  const handleSignOut = () => {
    setUser(null)
    setToken('')
    setStatus({ state: 'idle', message: '' })
    setForm({ username: '', password: '' })
    setCreateStatus({ state: 'idle', message: '' })
    setGeneratedPassword('')
    setActiveView('home')
    setVolunteers([])
    setMentors([])
    setVolunteerStatus({ state: 'idle', message: '' })
    setProfile(null)
    setProfileStatus({ state: 'idle', message: '' })
    setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    setPasswordStatus({ state: 'idle', message: '' })
  }

  if (!user) {
    return (
      <div className="page">
        <header className="brand">
          <div className="brand-mark">
            <img src={logo} alt="VolunteerConnect logo" />
          </div>
          <div>
            <p className="brand-name">VolunteerConnect</p>
            <p className="brand-tag">Community platform starter</p>
          </div>
        </header>

        <main className="card">
          <h1>Sign in</h1>
          <p className="sub">Enter your credentials to continue.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            <label className="field">
              <span>Username</span>
              <input
                name="username"
                type="text"
                autoComplete="username"
                value={form.username}
                onChange={handleChange}
                placeholder="jane.doe"
                required
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                name="password"
                type="password"
                autoComplete="current-password"
                value={form.password}
                onChange={handleChange}
                placeholder="Enter your password"
                required
              />
            </label>

            <button className="submit" type="submit" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {status.message ? (
            <p className={`status ${status.state}`}>{status.message}</p>
          ) : null}
          {token ? (
            <div className="token">
              <span>Token</span>
              <strong>{token}</strong>
            </div>
          ) : null}
        </main>

        <footer className="footnote">
          This is a starter login screen only.
        </footer>
      </div>
    )
  }

  const navSections = [
    {
      title: 'Communication',
      items: [
        { key: 'chat', label: 'Chat', meta: '1-on-1 & Groups' },
      ],
    },
    {
      title: 'Work',
      items: [
        { key: 'projects', label: 'Projects' },
        { key: 'tasks', label: 'Task Board', meta: 'Kanban style' },
      ],
    },
    {
      title: 'People',
      items: [
        { key: 'volunteers', label: 'Volunteers', meta: 'Active roster' },
      ],
    },
    {
      title: 'Schedule',
      items: [
        { key: 'calendar', label: 'Calendar', meta: 'Leave Requests & Events', badge: isMentor || isAdmin ? '3' : '' },
      ],
    },
    {
      title: 'Insights',
      items: [
        { key: 'stats', label: 'Statistics & School Visits' },
      ],
    },
    {
      title: 'Support',
      items: [
        { key: 'support', label: 'Maintenance Tickets' },
      ],
    },
  ]

  if (isMentor || isAdmin) {
    navSections.push({
      title: 'Admin',
      items: [
        { key: 'recruitment', label: 'Recruitment' },
      ],
    })
  }

  const quickCards = [
    {
      title: 'Leave Balance',
      value: 'Days used 1',
      detail: 'Remaining 1 (out of 2/month)',
    },
    {
      title: 'Next Deadline',
      value: 'Community Outreach Plan',
      detail: 'Due in 4 days',
    },
    {
      title: 'Upcoming Events',
      value: 'School Visit - East Campus',
      detail: 'Tomorrow at 10:30',
    },
    {
      title: 'Active Tickets',
      value: '2 open requests',
      detail: 'Last update 3 hours ago',
    },
  ]

  const recentActivity = [
    'Reviewed task board updates for the week.',
    'Added two volunteers to the Outreach project.',
    'Submitted a maintenance request for projector cables.',
  ]

  const formatDateTime = (value) => {
    if (!value) {
      return 'N/A'
    }
    return new Date(value).toLocaleString()
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'menu-open' : ''}`}>
      <aside
        className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${sidebarOpen ? 'open' : ''}`}
      >
        <div className="sidebar-head">
          <div className="brand-mark">
            <img src={logo} alt="VolunteerConnect logo" />
          </div>
          <div className="brand-text">
            <p className="brand-name">VolunteerConnect</p>
            <p className="brand-tag">Volunteer management</p>
          </div>
          <button
            className="icon-button collapse-toggle"
            type="button"
            onClick={() => setSidebarCollapsed((value) => !value)}
            aria-label="Collapse sidebar"
          >
            <Icon name="collapse" />
          </button>
        </div>

        <nav className="nav">
          {navSections.map((section) => (
            <div className="nav-section" key={section.title}>
              <p className="nav-title">{section.title}</p>
              {section.items.map((item) => (
                  <button
                    className={`nav-item ${activeView === item.key ? 'active' : ''}`}
                    type="button"
                    key={item.key}
                    onClick={() => {
                      setActiveView(item.key)
                      setSidebarOpen(false)
                    }}
                  >
                  <span className="nav-icon">
                    <Icon name={item.key} />
                  </span>
                  <span className="nav-label">
                    <span>{item.label}</span>
                    {item.meta ? <small>{item.meta}</small> : null}
                  </span>
                  {item.badge ? <span className="nav-badge">{item.badge}</span> : null}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      {sidebarOpen ? (
        <button
          className="overlay"
          type="button"
          aria-label="Close menu"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <main className="dashboard">
        <header className="topbar">
          <button
            className="icon-button menu-toggle"
            type="button"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Icon name="menu" />
          </button>
          <div className="welcome">
            <h1>
              {activeView === 'volunteers'
                ? isAdmin
                  ? 'Volunteer and Mentor Directory'
                  : 'Volunteer Directory'
                : activeView === 'profile'
                  ? 'My Profile'
                : `Welcome, ${user.name}`}
            </h1>
            <p>
              {activeView === 'volunteers'
                ? isAdmin
                  ? 'Manage volunteer and mentor accounts and access.'
                  : 'Manage volunteer accounts and access.'
                : activeView === 'profile'
                  ? 'Review your account details and update your password.'
                : 'Ready to coordinate your volunteer week?'}
            </p>
          </div>
          <div className="topbar-actions">
            <span className="role-chip">{user.roleLabel}</span>
            <button className="icon-button" type="button" aria-label="Notifications">
              <Icon name="bell" />
            </button>
            <button className="ghost" type="button" onClick={() => setActiveView('profile')}>Profile</button>
            <button className="ghost" type="button" onClick={handleSignOut}>Sign out</button>
            <button
              className="avatar profile-avatar"
              type="button"
              aria-label="Open profile"
              onClick={() => setActiveView('profile')}
            >
              <span>{user.name.slice(0, 1).toUpperCase()}</span>
            </button>
          </div>
        </header>

        {activeView === 'volunteers' ? (
          <section className="volunteer-panel">
            <div className="panel-head">
              <h2>{isAdmin ? 'Directory accounts' : 'Volunteer accounts'}</h2>
              <button className="ghost" type="button" onClick={() => setActiveView('home')}>
                Back to dashboard
              </button>
            </div>
            {volunteerStatus.state === 'loading' ? (
              <p className="muted">Loading directory...</p>
            ) : null}
            {volunteerStatus.state === 'error' ? (
              <p className="status error">{volunteerStatus.message}</p>
            ) : null}
            {volunteers.length === 0 && volunteerStatus.state !== 'loading' ? (
              <p className="muted">No volunteers found yet.</p>
            ) : null}
            {volunteers.length > 0 ? (
              <div className="volunteer-table">
                <div className="volunteer-row header">
                  <span>Name</span>
                  <span>Email</span>
                  <span>Actions</span>
                </div>
                {volunteers.map((volunteer) => (
                  <div className="volunteer-row" key={volunteer.id}>
                    <span>{volunteer.username}</span>
                    <span>{volunteer.email}</span>
                    <div className="volunteer-actions">
                      <button
                        className="danger"
                        type="button"
                        onClick={() => deleteManagedUser(volunteer, 'VOLUNTEER')}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {isAdmin ? (
              <>
                <div className="panel-head">
                  <h2>Mentor accounts</h2>
                </div>
                {mentors.length === 0 && volunteerStatus.state !== 'loading' ? (
                  <p className="muted">No mentors found yet.</p>
                ) : null}
                {mentors.length > 0 ? (
                  <div className="volunteer-table">
                    <div className="volunteer-row header">
                      <span>Name</span>
                      <span>Email</span>
                      <span>Actions</span>
                    </div>
                    {mentors.map((mentor) => (
                      <div className="volunteer-row" key={mentor.id}>
                        <span>{mentor.username}</span>
                        <span>{mentor.email}</span>
                        <div className="volunteer-actions">
                          <button
                            className="danger"
                            type="button"
                            onClick={() => deleteManagedUser(mentor, 'MENTOR')}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </>
            ) : null}
          </section>
        ) : activeView === 'profile' ? (
          <section className="profile-panel">
            <div className="panel-head">
              <h2>Account profile</h2>
              <button className="ghost" type="button" onClick={() => setActiveView('home')}>
                Back to dashboard
              </button>
            </div>

            {profileStatus.state === 'loading' ? (
              <p className="muted">Loading profile...</p>
            ) : null}
            {profileStatus.state === 'error' ? (
              <p className="status error">{profileStatus.message}</p>
            ) : null}

            {profile ? (
              <div className="profile-grid">
                <div className="profile-field">
                  <span>Username</span>
                  <strong>{profile.username}</strong>
                </div>
                <div className="profile-field">
                  <span>Email</span>
                  <strong>{profile.email}</strong>
                </div>
                <div className="profile-field">
                  <span>Roles</span>
                  <strong>{profile.roles?.join(', ') || user.role}</strong>
                </div>
                <div className="profile-field">
                  <span>Created at</span>
                  <strong>{formatDateTime(profile.createdAt)}</strong>
                </div>
                <div className="profile-field">
                  <span>Last update</span>
                  <strong>{formatDateTime(profile.updatedAt)}</strong>
                </div>
              </div>
            ) : null}

            <form className="password-change-form" onSubmit={handlePasswordChangeSubmit}>
              <h3>Change password</h3>
              <label className="field">
                <span>Current password</span>
                <input
                  name="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={handlePasswordFormChange}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label className="field">
                <span>New password</span>
                <input
                  name="newPassword"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={handlePasswordFormChange}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="field">
                <span>Confirm new password</span>
                <input
                  name="confirmPassword"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={handlePasswordFormChange}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <button className="primary" type="submit" disabled={passwordStatus.state === 'loading'}>
                {passwordStatus.state === 'loading' ? 'Saving...' : 'Update password'}
              </button>
              {passwordStatus.message ? (
                <p className={`status ${passwordStatus.state}`}>{passwordStatus.message}</p>
              ) : null}
            </form>
          </section>
        ) : (
          <>
            <section className="quick-glance">
              {quickCards.map((card) => (
                <article className="glance-card" key={card.title}>
                  <p className="glance-title">{card.title}</p>
                  <h3>{card.value}</h3>
                  <p className="glance-detail">{card.detail}</p>
                </article>
              ))}
            </section>

            <section className="dashboard-grid">
              <div className="panel">
                <div className="panel-head">
                  <h2>Recent Activity</h2>
                  <button className="ghost" type="button">View all</button>
                </div>
                <ul className="activity">
                  {recentActivity.map((item, index) => (
                    <li key={`${item}-${index}`}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="panel role-panel">
                {isAdmin ? (
                  <>
                    <h2>Admin Overview</h2>
                    <p>Global visibility across volunteers, mentors, and sites.</p>
                    <button className="primary" type="button">Open admin tools</button>
                  </>
                ) : null}
                {isMentor ? (
                  <>
                    <h2>Recruitment Reminders</h2>
                    <p>Two candidates need follow-up this week.</p>
                    <button className="primary" type="button">Review applicants</button>
                  </>
                ) : null}
                {isVolunteer ? (
                  <>
                    <h2>Your Summary</h2>
                    <p>Leave balance, tasks, and personal stats live here.</p>
                    <button className="primary" type="button">Request Leave</button>
                  </>
                ) : null}
                {isAdmin || isMentor ? (
                  <form className="create-form" onSubmit={handleCreateSubmit}>
                    <h3>Create account</h3>
                    <label className="field">
                      <span>Username</span>
                      <input
                        name="username"
                        type="text"
                        value={createForm.username}
                        onChange={handleCreateChange}
                        required
                      />
                    </label>
                    <label className="field">
                      <span>Email</span>
                      <input
                        name="email"
                        type="email"
                        value={createForm.email}
                        onChange={handleCreateChange}
                        required
                      />
                    </label>
                    {isAdmin ? (
                      <label className="field">
                        <span>Role</span>
                        <select name="role" value={createForm.role} onChange={handleCreateChange}>
                          <option value="MENTOR">Mentor</option>
                          <option value="VOLUNTEER">Volunteer</option>
                          <option value="ADMIN">Admin</option>
                        </select>
                      </label>
                    ) : (
                      <div className="field">
                        <span>Role</span>
                        <strong>Volunteer</strong>
                      </div>
                    )}
                    <button className="primary" type="submit" disabled={createStatus.state === 'loading'}>
                      {createStatus.state === 'loading' ? 'Creating...' : 'Create account'}
                    </button>
                    {createStatus.message ? (
                      <p className={`status ${createStatus.state}`}>{createStatus.message}</p>
                    ) : null}
                    {generatedPassword ? (
                      <div className="password-card">
                        <p>Generated password</p>
                        <strong>{generatedPassword}</strong>
                      </div>
                    ) : null}
                  </form>
                ) : null}
              </div>
            </section>

            <section className="canvas">
              <div>
                <h2>Workspace</h2>
                <p>Drop future widgets and analytics here.</p>
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}

export default App
