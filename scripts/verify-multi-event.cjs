const http = require('http');

async function request(path, options = {}) {
  const url = new URL(path, 'http://localhost:3000');
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch(e) {}
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json || body,
          cookie: res.headers['set-cookie']
        });
      });
    });
    req.on('error', reject);
    if (options.body) req.write(JSON.stringify(options.body));
    req.end();
  });
}

function extractCookie(cookieHeader) {
  if (!cookieHeader) return '';
  if (Array.isArray(cookieHeader)) {
    return cookieHeader.map(c => c.split(';')[0]).join('; ');
  }
  return cookieHeader.split(';')[0];
}

async function runTest() {
  console.log('--- STARTING MULTI-EVENT VERIFICATION ---');

  // 1. Admin Login
  console.log('1. Logging in as Admin...');
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: { role: 'admin', email: 'admin@gwd.com', password: 'admin1234' }
  });
  if (loginRes.status !== 200) throw new Error('Admin login failed: ' + JSON.stringify(loginRes.data));
  const adminCookie = extractCookie(loginRes.cookie);
  console.log('✓ Admin authenticated successfully.');

  // 2. Create Event 1
  console.log('2. Creating Event 1: "Alpha Winter Cup"...');
  const ev1Res = await request('/api/admin/events', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      name: 'Alpha Winter Cup ' + Date.now(),
      description: 'First annual multi-event cup test',
      registration_start: '2026-10-01',
      registration_end: '2026-10-10',
      voting_start: '2026-10-11',
      voting_end: '2026-10-15',
      leaderboard_public: false,
      max_tens: 5
    }
  });
  if (ev1Res.status !== 200) throw new Error('Failed to create Event 1: ' + JSON.stringify(ev1Res.data));
  const event1 = ev1Res.data.event;
  console.log(`✓ Event 1 created: ID=${event1.id}, Status=${event1.status}`);
  if (event1.status !== 'DRAFT') throw new Error('Event 1 must start in DRAFT');

  // 3. Lifecycle Event 1: DRAFT -> REGISTRATION_OPEN
  console.log('3. Opening registration for Event 1...');
  const t1 = await request('/api/event/transition', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { eventId: event1.id, targetStatus: 'REGISTRATION_OPEN' }
  });
  if (t1.status !== 200) throw new Error('Failed transition: ' + JSON.stringify(t1.data));
  console.log('✓ Event 1 status is now REGISTRATION_OPEN.');

  // 4. Register 3 teams in Event 1
  console.log('4. Registering 3 teams in Event 1...');
  const regT1 = await request('/api/teams/register', {
    method: 'POST',
    body: {
      eventId: event1.id,
      name: 'Alpha Wolves',
      leader_name: 'Alice',
      leader_email: `alice_${Date.now()}@example.com`,
      password: 'password123'
    }
  });
  const team1 = regT1.data.team;
  console.log(`✓ Registered team: ${team1.code} (${team1.name})`);

  const regT2 = await request('/api/teams/register', {
    method: 'POST',
    body: {
      eventId: event1.id,
      name: 'Bravo Falcons',
      leader_name: 'Bob',
      leader_email: `bob_${Date.now()}@example.com`,
      password: 'password123'
    }
  });
  const team2 = regT2.data.team;
  console.log(`✓ Registered team: ${team2.code} (${team2.name})`);

  const regT3 = await request('/api/teams/register', {
    method: 'POST',
    body: {
      eventId: event1.id,
      name: 'Charlie Eagles',
      leader_name: 'Charlie',
      leader_email: `charlie_${Date.now()}@example.com`,
      password: 'password123'
    }
  });
  const team3 = regT3.data.team;
  console.log(`✓ Registered team: ${team3.code} (${team3.name})`);

  // 5. Admin Approves all 3 teams in Event 1
  console.log('5. Admin approving all 3 teams...');
  for (const tid of [team1.id, team2.id, team3.id]) {
    await request(`/api/admin/registrations/${tid}/review`, {
      method: 'POST',
      headers: { Cookie: adminCookie },
      body: { action: 'APPROVE' }
    });
  }
  console.log('✓ All 3 teams approved in Event 1.');

  // 6. Transition Event 1 to VOTING_OPEN
  console.log('6. Transitioning Event 1 to VOTING_OPEN...');
  await request('/api/event/transition', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { eventId: event1.id, targetStatus: 'REGISTRATION_CLOSED' }
  });
  await request('/api/event/transition', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { eventId: event1.id, targetStatus: 'VOTING_READY' }
  });
  await request('/api/event/transition', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { eventId: event1.id, targetStatus: 'VOTING_OPEN' }
  });
  console.log('✓ Event 1 is now in VOTING_OPEN.');

  // 7. Team 1 submits ballot for Event 1
  console.log('7. Team 1 rating eligible teams...');
  const loginT1 = await request('/api/auth/login', {
    method: 'POST',
    body: { role: 'team', code: team1.code, password: 'password123' }
  });
  const t1Cookie = extractCookie(loginT1.cookie);

  // Rate team2 = 10, team3 = 9
  await request('/api/ratings/save', {
    method: 'POST',
    headers: { Cookie: t1Cookie },
    body: { targetTeamId: team2.id, score: 10 }
  });
  await request('/api/ratings/save', {
    method: 'POST',
    headers: { Cookie: t1Cookie },
    body: { targetTeamId: team3.id, score: 9 }
  });
  const sub1 = await request('/api/ratings/submit', {
    method: 'POST',
    headers: { Cookie: t1Cookie },
    body: {}
  });
  if (sub1.status !== 200) throw new Error('Team 1 submit ballot failed: ' + JSON.stringify(sub1.data));
  console.log('✓ Team 1 ballot submitted and locked.');

  // 8. Close voting, publish results, archive Event 1
  console.log('8. Closing voting and publishing results for Event 1...');
  await request('/api/event/transition', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { eventId: event1.id, targetStatus: 'VOTING_CLOSED' }
  });
  await request('/api/event/transition', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { eventId: event1.id, targetStatus: 'RESULTS_PUBLISHED' }
  });
  await request('/api/leaderboard/publish', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { eventId: event1.id, isVisible: true }
  });

  // Archive Event 1
  console.log('9. Archiving Event 1...');
  const archRes = await request('/api/event/transition', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { eventId: event1.id, targetStatus: 'ARCHIVED' }
  });
  if (archRes.status !== 200) throw new Error('Failed to archive: ' + JSON.stringify(archRes.data));
  console.log('✓ Event 1 is successfully ARCHIVED.');

  // Verify modifications to Archived Event 1 are blocked
  const blockedRes = await request('/api/event/transition', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { eventId: event1.id, targetStatus: 'DRAFT' }
  });
  if (blockedRes.status === 400) {
    console.log('✓ Verified: Modification to Archived event is strictly blocked.');
  } else {
    throw new Error('Expected 400 on modifying archived event, got: ' + blockedRes.status);
  }

  // 10. Create Event 2 via Settings Duplication
  console.log('10. Duplicating settings from Event 1 to create Event 2...');
  const dupRes = await request('/api/admin/events/duplicate', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: {
      sourceEventId: event1.id,
      name: 'Beta Spring Summit ' + Date.now(),
      description: 'Second separate event, independent settings'
    }
  });
  if (dupRes.status !== 200) throw new Error('Failed duplication: ' + JSON.stringify(dupRes.data));
  const event2 = dupRes.data.event;
  console.log(`✓ Event 2 created: ID=${event2.id}, Status=${event2.status}`);

  // 11. Verify Event 2 starts 100% clean with NO teams or ratings from Event 1
  console.log('11. Verifying data isolation for Event 2...');
  const ev2TeamsRes = await request(`/api/admin/teams?eventId=${encodeURIComponent(event2.id)}`, {
    headers: { Cookie: adminCookie }
  });
  const ev2Teams = ev2TeamsRes.data.teams || [];
  console.log(`✓ Event 2 team count: ${ev2Teams.length} (Expected 0)`);
  if (ev2Teams.length !== 0) throw new Error('Data contamination! Event 2 has teams from previous event!');

  // Verify Event 1 teams are still intact
  const ev1TeamsRes = await request(`/api/admin/teams?eventId=${encodeURIComponent(event1.id)}`, {
    headers: { Cookie: adminCookie }
  });
  const ev1Teams = ev1TeamsRes.data.teams || [];
  console.log(`✓ Event 1 team count: ${ev1Teams.length} (Expected 3)`);
  if (ev1Teams.length !== 3) throw new Error('Event 1 teams were lost!');

  // 12. Register team in Event 2
  console.log('12. Opening registration for Event 2 and registering a new team...');
  await request('/api/event/transition', {
    method: 'POST',
    headers: { Cookie: adminCookie },
    body: { eventId: event2.id, targetStatus: 'REGISTRATION_OPEN' }
  });

  const regT4 = await request('/api/teams/register', {
    method: 'POST',
    body: {
      eventId: event2.id,
      name: 'Delta Titans',
      leader_name: 'David',
      leader_email: `david_${Date.now()}@example.com`,
      password: 'password123'
    }
  });
  const team4 = regT4.data.team;
  console.log(`✓ Registered team in Event 2: ${team4.code} (${team4.name})`);

  // Verify team4 is NOT in Event 1
  const ev1TeamsCheck = await request(`/api/admin/teams?eventId=${encodeURIComponent(event1.id)}`, {
    headers: { Cookie: adminCookie }
  });
  const foundInEv1 = ev1TeamsCheck.data.teams.some(t => t.id === team4.id);
  if (foundInEv1) throw new Error('Event 2 team leaked into Event 1!');
  console.log('✓ Verified: Event 2 team does NOT appear in Event 1.');

  // 13. Verify Leaderboard Isolation
  console.log('13. Checking leaderboard isolation...');
  const lb1 = await request(`/api/leaderboard?eventId=${encodeURIComponent(event1.id)}`);
  const lb2 = await request(`/api/leaderboard?eventId=${encodeURIComponent(event2.id)}`);
  console.log(`✓ Event 1 leaderboard entries: ${lb1.data.leaderboard?.length || 0}`);
  console.log(`✓ Event 2 leaderboard entries: ${lb2.data.leaderboard?.length || 0}`);
  if ((lb2.data.leaderboard?.length || 0) !== 0) throw new Error('Event 2 has unexpected leaderboard entries!');

  console.log('\n======================================================');
  console.log('🎉 ALL MULTI-EVENT VERIFICATION CHECKS PASSED PERFECTLY!');
  console.log('======================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ VERIFICATION FAILED:', err);
  process.exit(1);
});
