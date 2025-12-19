const appsDiv = document.getElementById('apps')

async function loadApps() {
  const apps = await desklet.getApps()
  appsDiv.innerHTML = ''

  if (apps.length === 0) {
    appsDiv.innerHTML = '<p>No apps added yet</p>'
    return
  }

  apps.forEach(app => {
    const div = document.createElement('div')
    div.className = 'app'
    div.innerText = app.name
    div.onclick = () => desklet.openApp(app.id)
    appsDiv.appendChild(div)
  })
}

loadApps()
const dropdown = document.getElementById('menu-dropdown')

function toggleMenu() {
  dropdown.classList.toggle('hidden')
}

function menuAction(action) {
  dropdown.classList.add('hidden')

  switch (action) {
    case 'save':
      alert('Open an app first, then use menu inside app window.')
      break
    case 'rename':
      alert('Rename works inside app view.')
      break
    case 'icon':
      alert('Icon change works inside app view.')
      break
    case 'about':
      alert('Desklet v2.0\nRun HTML as Desktop Apps')
      break
  }
}

document.addEventListener('click', (e) => {
  if (!e.target.closest('.menu-wrapper')) {
    dropdown.classList.add('hidden')
  }
})
