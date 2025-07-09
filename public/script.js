document.addEventListener('DOMContentLoaded', () => {
    // Helper function to get query parameters from URL
    function getQueryParam(name) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(name);
    }

    // Load content based on the current page
    const currentPage = window.location.pathname;

    if (currentPage === '/index.html' || currentPage === '/') {
        // Initial dashboard (before login)
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }

        if (signupBtn) {
            signupBtn.addEventListener('click', () => {
                window.location.href = 'signup.html';
            });
        }
    } else if (currentPage === '/dashboard.html') {
        // Logged-in dashboard
        const userId = localStorage.getItem('user_id');
        if (!userId) {
            window.location.href = 'index.html'; // Redirect to login if no user ID
        }

        loadGroups(userId);

        // Event listener for create group button
        document.getElementById('createGroupBtn').addEventListener('click', () => {
            const groupName = prompt("Enter the name of the new group:");
            if (groupName) {
                // Assuming the current user is the organizer
                const organizerId = userId; // Replace with actual user ID
                createGroup(groupName, organizerId);
            } else {
                alert("Group name is required.");
            }
        });

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                localStorage.removeItem('user_id');
                window.location.href = 'index.html';
            });
        }
    } else if (currentPage === '/group.html') {
        loadGroupDetails();

        // Event listener for create trip button
        document.getElementById('createTripBtn').addEventListener('click', () => {
            const groupId = getQueryParam('groupId');
            if (groupId) {
                const destination = prompt("Enter the trip destination:");
                const start_date = prompt("Enter the start date (YYYY-MM-DD):");
                const end_date = prompt("Enter the end date (YYYY-MM-DD):");
                if (destination && start_date && end_date) {
                    createTrip(groupId, destination, start_date, end_date);
                } else {
                    alert("All trip details are required.");
                }
            } else {
                alert("Group ID is missing.");
            }
        });

        // Event listener for back to dashboard button
        document.getElementById('backToDashboardBtn').addEventListener('click', () => {
            window.location.href = 'dashboard.html';
        });
    } else if (currentPage === '/trip.html') {
        loadTripDetails();

        // Event listener for add activity button
        document.getElementById('addActivityBtn').addEventListener('click', () => {
            const tripId = getQueryParam('tripId');
            if (tripId) {
                const activityName = prompt("Enter activity name:");
                const activityCost = prompt("Enter activity cost:");
                const suggestedBy = 1; // Replace with actual user ID
                if (activityName && activityCost) {
                    addActivity(tripId, activityName, activityCost, suggestedBy);
                } else {
                    alert("All activity details are required.");
                }
            } else {
                alert("Trip ID is missing.");
            }
        });

        // Event listener for back to group button
        document.getElementById('backToGroupBtn').addEventListener('click', () => {
            const tripId = getQueryParam('tripId');
            // Fetch trip details to get the group ID
            fetch(`/trips/${tripId}`)
                .then(response => response.json())
                .then(trip => {
                    if (trip && trip.group_id) {
                        window.location.href = `group.html?groupId=${trip.group_id}`;
                    } else {
                        alert("Failed to retrieve group ID.");
                        window.location.href = 'index.html'; // Redirect to dashboard as fallback
                    }
                })
                .catch(error => {
                    console.error('Error fetching trip details:', error);
                    alert("Error retrieving group ID.");
                    window.location.href = 'index.html'; // Redirect to dashboard as fallback
                });
        });
    }

    async function createGroup(name, organizer_id) {
        try {
            const response = await fetch('/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name, organizer_id }),
            });

            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                window.location.href = `group.html?groupId=${data.groupId}`;
            } else {
                alert(`Failed to create group: ${data.message}`);
            }
        } catch (error) {
            console.error('Error creating group:', error);
            alert('Error creating group.');
        }
    }

    async function createTrip(groupId, destination, start_date, end_date) {
        try {
            const response = await fetch(`/groups/${groupId}/trips`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ destination, start_date, end_date }),
            });

            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                window.location.href = `trip.html?tripId=${data.tripId}`;
            } else {
                alert(`Failed to create trip: ${data.message}`);
            }
        } catch (error) {
            console.error('Error creating trip:', error);
            alert('Error creating trip.');
        }
    }

    async function addActivity(tripId, name, cost, suggestedBy) {
        try {
            const response = await fetch(`/trips/${tripId}/activities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ name: name, cost: cost, suggested_by: suggestedBy }),
            });

            const data = await response.json();
            if (response.ok) {
                alert(data.message);
                loadTripDetails();
            } else {
                alert(`Failed to add activity: ${data.message}`);
            }
        } catch (error) {
            console.error('Error adding activity:', error);
            alert('Error adding activity.');
        }
    }

    async function loadGroups(userId) {
        try {
            const response = await fetch('/groups');
            const groups = await response.json();
            const groupList = document.getElementById('groupList');

            if (response.ok) {
                groupList.innerHTML = groups.map(group => `
                    <li><a href="group.html?groupId=${group.group_id}">${group.name}</a></li>
                `).join('');
            } else {
                groupList.innerHTML = `<p>Failed to load groups: ${groups.message}</p>`;
            }
        } catch (error) {
            console.error('Error loading groups:', error);
            document.getElementById('groupList').innerHTML = '<p>Error loading groups.</p>';
        }
    }

    // Function to load group details on group.html
    async function loadGroupDetails() {
        const groupId = getQueryParam('groupId');
        if (!groupId) {
            document.body.innerHTML = '<h2>Error: Group ID not provided.</h2>';
            return;
        }

        try {
            const response = await fetch(`/groups/${groupId}`);
            const group = await response.json();

            if (response.ok) {
                document.querySelector('#groupDetails h2').textContent = group.name;

                // Load trips for the group
                loadTrips(groupId);
            } else {
                document.getElementById('groupDetails').innerHTML = `<p>${group.message}</p>`;
            }
        } catch (error) {
            console.error('Error loading group details:', error);
            document.getElementById('groupDetails').innerHTML = '<p>Error loading group details.</p>';
        }
    }

    // Function to load trips on group.html
    async function loadTrips(groupId) {
        try {
            const response = await fetch(`/groups/${groupId}/trips`);
            const trips = await response.json();
            const tripList = document.getElementById('tripList');

            if (response.ok) {
                tripList.innerHTML = trips.map(trip => `
                    <li><a href="trip.html?tripId=${trip.trip_id}">${trip.destination} (${trip.start_date} - ${trip.end_date})</a></li>
                `).join('');
            } else {
                tripList.innerHTML = `<p>Failed to load trips: ${trips.message}</p>`;
            }
        } catch (error) {
            console.error('Error loading trips:', error);
            document.getElementById('tripList').innerHTML = '<p>Error loading trips.</p>';
        }
    }

    // Function to load trip details on trip.html
    async function loadTripDetails() {
        const tripId = getQueryParam('tripId');
        if (!tripId) {
            document.body.innerHTML = '<h2>Error: Trip ID not provided.</h2>';
            return;
        }

        try {
            const response = await fetch(`/trips/${tripId}`);
            const trip = await response.json();

            if (response.ok) {
                document.querySelector('#tripDetails h2').textContent = trip.destination;
                document.getElementById('tripDates').textContent = `${trip.start_date} - ${trip.end_date}`;

                // Load activities for the trip
                loadActivities(tripId);
                // Load budget details for the trip
                loadBudget(tripId);
            } else {
                document.getElementById('tripDetails').innerHTML = `<p>${trip.message}</p>`;
            }
        } catch (error) {
            console.error('Error loading trip details:', error);
            document.getElementById('tripDetails').innerHTML = '<p>Error loading trip details.</p>';
        }
    }

    // Function to load activities on trip.html
    async function loadActivities(tripId) {
        try {
            const response = await fetch(`/trips/${tripId}/activities`);
            const activities = await response.json();
            const activityList = document.getElementById('activityList');

            if (response.ok) {
                activityList.innerHTML = activities.map(activity => `
                    <li>${activity.name} - Cost: ${activity.cost}</li>
                `).join('');
            } else {
                activityList.innerHTML = `<p>Failed to load activities: ${activities.message}</p>`;
            }
        } catch (error) {
            console.error('Error loading activities:', error);
            document.getElementById('activityList').innerHTML = '<p>Error loading activities.</p>';
        }
    }

    // Function to load budget on trip.html
    async function loadBudget(tripId) {
        try {
            const response = await fetch(`/trips/${tripId}/budget`);
            const budget = await response.json();

            if (response.ok) {
                document.getElementById('totalBudget').textContent = budget.total_budget;
                document.getElementById('remainingBalance').textContent = budget.balance;
            } else {
                document.getElementById('tripDetails').innerHTML += `<p>Failed to load budget: ${budget.message}</p>`;
            }
        } catch (error) {
            console.error('Error loading budget:', error);
            document.getElementById('tripDetails').innerHTML += '<p>Error loading budget.</p>';
        }
    }
});
