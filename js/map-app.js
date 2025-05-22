// CleanBite Interactive Map Application
class CleanBiteMap {
  constructor() {
    this.map = null;
    this.markers = [];
    this.restaurants = [];
    this.filteredRestaurants = [];
    this.activeMarker = null;
    
    // DOM elements
    this.searchInput = document.getElementById('searchInput');
    this.clearSearch = document.getElementById('clearSearch');
    this.ratingFilter = document.getElementById('ratingFilter');
    this.typeFilter = document.getElementById('typeFilter');
    this.restaurantPanel = document.getElementById('restaurantPanel');
    this.panelContent = document.getElementById('panelContent');
    this.searchResults = document.getElementById('searchResults');
    this.resultsList = document.getElementById('resultsList');
    this.resultsCount = document.getElementById('resultsCount');
    this.loading = document.getElementById('loading');
    this.toggleViewBtn = document.getElementById('toggleView');
    
    // View state
    this.isListView = false;
    
    this.init();
  }
  
  async init() {
    this.initMap();
    this.setupEventListeners();
    await this.loadRestaurants();
    this.hideLoading();
  }
  
  initMap() {
    // Initialize Mapbox map
    mapboxgl.accessToken = 'pk.eyJ1Ijoiam9qb2NlbmEiLCJhIjoiY21hem1ydHVsMGljeDJqc2hzY2YybW5paiJ9.3secN80D9gsOkQMPp13fow';
    
    this.map = new mapboxgl.Map({
      container: 'map',
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-2.8, 54.05], // Lancaster
      zoom: 12,
      attributionControl: false
    });
    
    // Add navigation controls
    this.map.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add scale control
    this.map.addControl(new mapboxgl.ScaleControl({
      maxWidth: 100,
      unit: 'metric'
    }), 'bottom-right');
  }
  
  setupEventListeners() {
    // Search functionality
    this.searchInput.addEventListener('input', (e) => this.handleSearch(e.target.value));
    this.clearSearch.addEventListener('click', () => this.clearSearchInput());
    
    // Filter functionality
    this.ratingFilter.addEventListener('change', () => this.applyFilters());
    this.typeFilter.addEventListener('change', () => this.applyFilters());
    
    // Panel controls
    document.getElementById('closePanel').addEventListener('click', () => this.closePanel());
    
    // View toggle
    this.toggleViewBtn.addEventListener('click', () => this.toggleView());
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closePanel();
        this.hideSearchResults();
      }
    });
    
    // Click outside to close panels
    document.addEventListener('click', (e) => {
      if (!this.restaurantPanel.contains(e.target) && !e.target.closest('.marker')) {
        this.closePanel();
      }
      if (!this.searchResults.contains(e.target) && !this.searchInput.contains(e.target)) {
        this.hideSearchResults();
      }
    });
  }
  
  async loadRestaurants() {
    try {
      const response = await fetch('Data/restaurants.json');
      const data = await response.json();
      
      // Extract restaurants from nested structure
      this.restaurants = data.FHRSEstablishment.EstablishmentCollection.EstablishmentDetail;
      this.filteredRestaurants = [...this.restaurants];
      
      // Process and add markers
      this.processRestaurants();
      this.addMarkersToMap();
      
    } catch (error) {
      console.error('Error loading restaurant data:', error);
      this.showError('Failed to load restaurant data. Please try again later.');
    }
  }
  
  processRestaurants() {
    this.restaurants = this.restaurants.map(restaurant => ({
      ...restaurant,
      // Normalize data for easier access
      name: restaurant.BusinessName,
      type: restaurant.BusinessType,
      rating: parseInt(restaurant.RatingValue) || 0,
      address: this.formatAddress(restaurant),
      latitude: parseFloat(restaurant.Geocode.Latitude),
      longitude: parseFloat(restaurant.Geocode.Longitude),
      ratingDate: restaurant.RatingDate,
      // Add search text for filtering
      searchText: `${restaurant.BusinessName} ${restaurant.BusinessType} ${restaurant.RatingValue}`.toLowerCase()
    }));
  }
  
  formatAddress(restaurant) {
    const addressParts = [
      restaurant.AddressLine1,
      restaurant.AddressLine2,
      restaurant.AddressLine3,
      restaurant.AddressLine4,
      restaurant.PostCode
    ].filter(Boolean);
    
    return addressParts.join(', ');
  }
  
  addMarkersToMap() {
    // Clear existing markers
    this.clearMarkers();
    
    this.filteredRestaurants.forEach(restaurant => {
      if (restaurant.latitude && restaurant.longitude) {
        const marker = this.createMarker(restaurant);
        this.markers.push({ marker, restaurant });
      }
    });
  }
  
  createMarker(restaurant) {
    const el = document.createElement('div');
    el.className = 'marker';
    el.style.backgroundColor = this.getMarkerColor(restaurant.rating);
    
    // Add click event
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      this.showRestaurantDetails(restaurant);
      this.highlightMarker(el);
    });
    
    // Create marker with popup
    const marker = new mapboxgl.Marker(el)
      .setLngLat([restaurant.longitude, restaurant.latitude])
      .addTo(this.map);
    
    return marker;
  }
  
  getMarkerColor(rating) {
    if (rating >= 4) return '#2ecc71'; // Green
    if (rating === 3) return '#f1c40f'; // Yellow
    return '#e74c3c'; // Red
  }
  
  getRatingClass(rating) {
    if (rating >= 4) return 'excellent';
    if (rating === 3) return 'good';
    return 'poor';
  }
  
  getRatingText(rating) {
    if (rating >= 4) return 'Excellent';
    if (rating === 3) return 'Good';
    return 'Poor';
  }
  
  getRatingDescription(rating) {
    if (rating === 5) return 'Very high hygiene standards - negligible risk';
    if (rating === 4) return 'Good hygiene standards - low risk';
    if (rating === 3) return 'Generally satisfactory - medium risk';
    if (rating === 2) return 'Some improvement necessary - high risk';
    if (rating === 1) return 'Major improvement necessary - very high risk';
    return 'Urgent improvement required';
  }
  
  generateReviewSummary(restaurant) {
    const summaries = {
      excellent: [
        'This establishment maintains excellent hygiene standards with consistent high-quality food safety practices.',
        'A highly recommended venue with outstanding cleanliness and food handling procedures.',
        'Exemplary hygiene standards make this a safe and trustworthy dining choice.',
        'This business demonstrates exceptional commitment to food safety and customer well-being.'
      ],
      good: [
        'This establishment maintains good hygiene standards with reliable food safety practices.',
        'A solid choice for dining with consistent cleanliness and proper food handling.',
        'Good hygiene standards make this a dependable option for safe dining.',
        'This business shows good commitment to maintaining food safety standards.'
      ],
      poor: [
        'This establishment needs improvement in hygiene standards and food safety practices.',
        'Consider dining elsewhere until hygiene standards are improved to acceptable levels.',
        'Food safety concerns have been identified that require attention from management.',
        'Hygiene improvements are needed before this can be considered a safe dining option.'
      ]
    };
    
    const category = restaurant.rating >= 4 ? 'excellent' : 
                    restaurant.rating === 3 ? 'good' : 'poor';
    
    const categoryMessages = summaries[category];
    const randomIndex = Math.floor(Math.random() * categoryMessages.length);
    
    return categoryMessages[randomIndex];
  }
  
  highlightMarker(markerElement, animate = false) {
    // Remove previous highlight
    if (this.activeMarker) {
      this.activeMarker.style.transform = 'scale(1)';
      this.activeMarker.style.zIndex = '1';
      this.activeMarker.style.boxShadow = 'var(--shadow-md)';
    }
    
    // Highlight new marker
    this.activeMarker = markerElement;
    
    if (animate) {
      // Special animation for search-selected markers
      markerElement.style.transform = 'scale(1.5)';
      markerElement.style.zIndex = '20';
      markerElement.style.boxShadow = '0 4px 20px rgba(46, 204, 113, 0.6)';
      markerElement.style.transition = 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
      
      // Settle to final state
      setTimeout(() => {
        markerElement.style.transform = 'scale(1.3)';
        markerElement.style.boxShadow = '0 4px 16px rgba(46, 204, 113, 0.4)';
      }, 400);
    } else {
      markerElement.style.transform = 'scale(1.3)';
      markerElement.style.zIndex = '10';
      markerElement.style.boxShadow = '0 4px 16px rgba(46, 204, 113, 0.4)';
    }
  }
  
  showRestaurantDetails(restaurant, fromSearch = false) {
    const ratingClass = this.getRatingClass(restaurant.rating);
    const ratingText = this.getRatingText(restaurant.rating);
    const ratingDescription = this.getRatingDescription(restaurant.rating);
    const reviewSummary = this.generateReviewSummary(restaurant);
    
    this.panelContent.innerHTML = `
      <div class="restaurant-details">
        <div class="restaurant-name">${restaurant.name}</div>
        
        <div class="rating-display">
          <div class="rating-badge ${ratingClass}">${restaurant.rating}</div>
          <div class="rating-info">
            <div class="rating-text">${ratingText} Hygiene Rating</div>
            <div class="rating-description">${ratingDescription}</div>
          </div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Business Type</div>
          <div class="detail-value">${restaurant.type}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Address</div>
          <div class="detail-value address-lines">${restaurant.address}</div>
        </div>
        
        <div class="detail-section">
          <div class="detail-label">Last Inspection</div>
          <div class="detail-value">${this.formatDate(restaurant.ratingDate)}</div>
        </div>
        
        ${restaurant.Scores ? `
          <div class="detail-section">
            <div class="detail-label">Detailed Scores</div>
            <div class="scores-grid">
              <div class="score-item">
                <div class="score-label">Hygiene</div>
                <div class="score-value">${restaurant.Scores.Hygiene}/5</div>
              </div>
              <div class="score-item">
                <div class="score-label">Structural</div>
                <div class="score-value">${restaurant.Scores.Structural}/5</div>
              </div>
              <div class="score-item">
                <div class="score-label">Management</div>
                <div class="score-value">${restaurant.Scores.ConfidenceInManagement}/5</div>
              </div>
            </div>
          </div>
        ` : ''}
        
        ${reviewSummary ? `
          <div class="detail-section">
            <div class="detail-label">Summary</div>
            <div class="review-summary">
              <div class="summary-text">${reviewSummary}</div>
            </div>
          </div>
        ` : ''}
      </div>
    `;
    
    this.restaurantPanel.classList.add('active');
    
    // Add special highlighting if opened from search
    if (fromSearch) {
      this.restaurantPanel.style.boxShadow = '0 8px 40px rgba(46, 204, 113, 0.3)';
      setTimeout(() => {
        this.restaurantPanel.style.boxShadow = 'var(--shadow-lg)';
      }, 2000);
    }
    
    this.hideSearchResults();
  }
  
  closePanel() {
    this.restaurantPanel.classList.remove('active');
    if (this.activeMarker) {
      this.activeMarker.style.transform = 'scale(1)';
      this.activeMarker.style.zIndex = '1';
      this.activeMarker.style.boxShadow = 'var(--shadow-md)';
      this.activeMarker.style.transition = 'all 0.3s ease';
      this.activeMarker = null;
    }
    
    // Reset panel styling
    this.restaurantPanel.style.boxShadow = 'var(--shadow-lg)';
  }
  
  handleSearch(query) {
    const trimmedQuery = query.trim();
    
    // Show/hide clear button
    this.clearSearch.style.display = trimmedQuery ? 'block' : 'none';
    
    if (trimmedQuery.length === 0) {
      this.hideSearchResults();
      this.applyFilters();
      return;
    }
    
    if (trimmedQuery.length < 2) {
      return;
    }
    
    // Filter restaurants based on search query
    const searchResults = this.restaurants.filter(restaurant =>
      restaurant.searchText.includes(trimmedQuery.toLowerCase())
    );
    
    this.showSearchResults(searchResults, trimmedQuery);
  }
  
  showSearchResults(results, query) {
    // Reset to normal search mode
    this.searchResults.classList.remove('list-view-mode');
    
    // Update header for search results
    const resultsHeader = this.searchResults.querySelector('.results-header h4');
    resultsHeader.textContent = 'Search Results';
    
    this.resultsCount.textContent = `${results.length} result${results.length !== 1 ? 's' : ''}`;
    
    if (results.length === 0) {
      this.resultsList.innerHTML = `
        <div class="result-item">
          <div class="result-name">No restaurants found</div>
          <div class="result-type">Try adjusting your search terms</div>
        </div>
      `;
    } else {
      this.resultsList.innerHTML = results.slice(0, 10).map(restaurant => `
        <div class="result-item" onclick="cleanBiteMap.selectRestaurant('${restaurant.FHRSID}')">
          <div class="result-name">${this.highlightText(restaurant.name, query)}</div>
          <div class="result-type">${restaurant.type}</div>
          <div class="result-rating">
            <div class="result-rating-badge ${this.getRatingClass(restaurant.rating)}">${restaurant.rating}</div>
            <span>${this.getRatingText(restaurant.rating)}</span>
          </div>
        </div>
      `).join('');
    }
    
    this.searchResults.style.display = 'block';
    setTimeout(() => {
      this.searchResults.classList.add('active');
    }, 50);
  }
  
  highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, '<strong>$1</strong>');
  }
  
  hideSearchResults() {
    // Don't hide if we're in list view mode
    if (this.searchResults.classList.contains('list-view-mode')) {
      return;
    }
    
    this.searchResults.classList.remove('active');
    setTimeout(() => {
      this.searchResults.style.display = 'none';
      this.searchResults.classList.remove('list-view-mode');
    }, 400);
  }
  
  selectRestaurant(fhrsId) {
    const restaurant = this.restaurants.find(r => r.FHRSID === fhrsId);
    if (!restaurant) return;
    
    // Hide search results immediately
    this.hideSearchResults();
    
    // Close any existing panel
    this.closePanel();
    
    // Add a temporary loading indicator on the map
    this.showMapTransition(restaurant);
    
    // Smoothly fly to the restaurant location
    this.map.flyTo({
      center: [restaurant.longitude, restaurant.latitude],
      zoom: 15,
      duration: 1200,
      curve: 1.42, // Controls the flight curve - makes it more dramatic
      easing: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // Custom easing
    });
    
    // Wait for the map movement to complete, then show details
    this.map.once('moveend', () => {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        // Find and highlight the marker first with animation
        const markerData = this.markers.find(m => m.restaurant.FHRSID === fhrsId);
        if (markerData) {
          this.highlightMarker(markerData.marker.getElement(), true);
        }
        
        // Then show the restaurant details with special animation
        this.showRestaurantDetails(restaurant, true);
        
        // Remove transition indicator
        this.hideMapTransition();
      }, 200);
    });
  }
  
  clearSearchInput() {
    this.searchInput.value = '';
    this.clearSearch.style.display = 'none';
    this.hideSearchResults();
    this.applyFilters();
  }
  
  applyFilters() {
    const ratingFilter = this.ratingFilter.value;
    const typeFilter = this.typeFilter.value;
    
    this.filteredRestaurants = this.restaurants.filter(restaurant => {
      // Rating filter
      let ratingMatch = true;
      if (ratingFilter) {
        const minRating = parseInt(ratingFilter);
        ratingMatch = restaurant.rating >= minRating;
      }
      
      // Type filter
      let typeMatch = true;
      if (typeFilter) {
        typeMatch = restaurant.type === typeFilter;
      }
      
      return ratingMatch && typeMatch;
    });
    
    // Update markers on map
    this.addMarkersToMap();
  }
  
  clearMarkers() {
    this.markers.forEach(({ marker }) => marker.remove());
    this.markers = [];
    this.activeMarker = null;
  }
  
  formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }
  
  hideLoading() {
    this.loading.style.display = 'none';
  }
  
  showMapTransition(restaurant) {
    // Create a temporary transition indicator
    if (!this.transitionIndicator) {
      this.transitionIndicator = document.createElement('div');
      this.transitionIndicator.className = 'map-transition-indicator';
      this.transitionIndicator.innerHTML = `
        <div class="transition-content">
          <div class="transition-spinner"></div>
          <div class="transition-text">Flying to <strong>${restaurant.name}</strong></div>
        </div>
      `;
      document.querySelector('.map-container').appendChild(this.transitionIndicator);
    }
    
    this.transitionIndicator.style.display = 'flex';
    setTimeout(() => {
      if (this.transitionIndicator) {
        this.transitionIndicator.classList.add('active');
      }
    }, 50);
  }
  
  hideMapTransition() {
    if (this.transitionIndicator) {
      this.transitionIndicator.classList.remove('active');
      setTimeout(() => {
        if (this.transitionIndicator) {
          this.transitionIndicator.style.display = 'none';
        }
      }, 300);
    }
  }
  
  toggleView() {
    if (this.isListView) {
      this.showMapView();
    } else {
      this.showListView();
    }
  }
  
  showListView() {
    this.isListView = true;
    
    // Update toggle button icon
    this.updateToggleButton();
    
    // Close any open panels
    this.closePanel();
    
    // Hide map container with transition
    const mapContainer = document.querySelector('.map-view');
    const legend = document.querySelector('.legend');
    
    if (mapContainer && legend) {
      mapContainer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
      mapContainer.style.opacity = '0';
      mapContainer.style.transform = 'scale(0.95)';
      legend.style.opacity = '0';
      
      setTimeout(() => {
        mapContainer.style.display = 'none';
        legend.style.display = 'none';
        this.showRestaurantList();
      }, 400);
    } else {
      // Fallback if elements not found
      this.showRestaurantList();
    }
  }
  
  showMapView() {
    this.isListView = false;
    
    // Update toggle button icon
    this.updateToggleButton();
    
    // Hide list view
    this.hideSearchResults();
    
    // Show map container with transition
    const mapContainer = document.querySelector('.map-view');
    const legend = document.querySelector('.legend');
    
    mapContainer.style.display = 'block';
    legend.style.display = 'block';
    
    // Reset any transition styles
    mapContainer.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
    legend.style.transition = 'opacity 0.4s ease';
    
    setTimeout(() => {
      mapContainer.style.opacity = '1';
      mapContainer.style.transform = 'scale(1)';
      legend.style.opacity = '1';
    }, 50);
  }
  
  showRestaurantList() {
    // Check if restaurants are loaded
    if (!this.restaurants || this.restaurants.length === 0) {
      // Show loading state
      this.resultsList.innerHTML = `
        <div class="result-item">
          <div class="result-name">Loading restaurants...</div>
          <div class="result-type">Please wait while data loads</div>
        </div>
      `;
      this.searchResults.classList.add('list-view-mode');
      this.searchResults.style.display = 'block';
      this.searchResults.classList.add('active');
      return;
    }
    
    // Sort restaurants alphabetically by name
    const sortedRestaurants = [...this.restaurants].sort((a, b) => {
      const nameA = a.name || a.BusinessName || '';
      const nameB = b.name || b.BusinessName || '';
      return nameA.localeCompare(nameB);
    });
    
    // Update search results to show full list
    this.searchResults.classList.add('list-view-mode');
    
    // Update header
    const resultsHeader = this.searchResults.querySelector('.results-header h4');
    if (resultsHeader) {
      resultsHeader.textContent = 'All Restaurants';
    }
    this.resultsCount.textContent = `${sortedRestaurants.length} restaurants`;
    
    // Simple list generation
    let htmlContent = '';
    for (let i = 0; i < Math.min(sortedRestaurants.length, 100); i++) { // Limit to first 100 for performance
      const restaurant = sortedRestaurants[i];
      const name = restaurant.name || restaurant.BusinessName || 'Unknown Restaurant';
      const type = restaurant.type || restaurant.BusinessType || 'Restaurant';
      const rating = restaurant.rating !== undefined ? restaurant.rating : (parseInt(restaurant.RatingValue) || 0);
      const fhrsId = restaurant.FHRSID || i;
      
      htmlContent += `
        <div class="result-item list-view-item" onclick="cleanBiteMap.selectFromList('${fhrsId}')">
          <div class="list-item-content">
            <div class="list-item-main">
              <div class="result-name">${name}</div>
              <div class="result-type">${type}</div>
            </div>
            <div class="list-item-rating">
              <div class="result-rating-badge ${this.getRatingClass(rating)}">${rating}</div>
              <div class="rating-label">${this.getRatingText(rating)}</div>
            </div>
          </div>
        </div>
      `;
    }
    
    this.resultsList.innerHTML = htmlContent;
    
    // Show search results with transition
    this.searchResults.style.display = 'block';
    this.searchResults.classList.add('active');
  }
  
  selectFromList(fhrsId) {
    // Switch back to map view first
    this.showMapView();
    
    // Wait for map to be visible, then select restaurant
    setTimeout(() => {
      this.selectRestaurant(fhrsId);
    }, 500);
  }
  
  updateToggleButton() {
    const icon = this.toggleViewBtn.querySelector('svg');
    
    if (this.isListView) {
      // Show map icon
      icon.innerHTML = `
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
        <circle cx="12" cy="10" r="3"/>
      `;
      this.toggleViewBtn.title = 'Show Map View';
    } else {
      // Show list icon
      icon.innerHTML = `
        <rect x="3" y="3" width="7" height="7"/>
        <rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/>
      `;
      this.toggleViewBtn.title = 'Show List View';
    }
  }
  
  showError(message) {
    this.hideLoading();
    this.panelContent.innerHTML = `
      <div class="error-state">
        <h3>Error</h3>
        <p>${message}</p>
      </div>
    `;
    this.restaurantPanel.classList.add('active');
  }
}

// Initialize the application when DOM is loaded
let cleanBiteMap;

document.addEventListener('DOMContentLoaded', () => {
  cleanBiteMap = new CleanBiteMap();
});

// Make some functions globally accessible for onclick handlers
window.cleanBiteMap = {
  selectRestaurant: (fhrsId) => cleanBiteMap.selectRestaurant(fhrsId),
  selectFromList: (fhrsId) => cleanBiteMap.selectFromList(fhrsId)
}; 