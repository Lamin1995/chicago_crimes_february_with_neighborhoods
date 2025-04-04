# Chicago Crime Visualization

This project visualizes crime data for Chicago neighborhoods, showing crime density and neighborhood connectivity using a k-nearest neighbors graph.

## Features

- Interactive map of Chicago neighborhoods colored by crime density
- K-nearest neighbors (k=5) graph overlay showing neighborhood connectivity
- Responsive design with zoom/pan capabilities
- Tooltips showing neighborhood name and crime count on hover
- Color legend explaining the crime density scale

## Project Structure

```
├── index.html              # Main visualization page
├── style.css               # Styling for the visualization
├── script.js               # D3.js visualization code (SOLID architecture)
├── preprocess_data.py      # Python data preprocessing script
├── test.html               # Component testing page
├── requirements.txt        # Python dependencies
├── neighborhoods.geojson   # Processed neighborhood boundaries
├── crimes_february_with_neighborhoods.geojson  # Processed crime data
└── README.md               # This documentation file
```

## Getting Started

### Prerequisites

- Modern web browser (Chrome, Firefox, Edge, etc.)
- Python 3.x with pandas, geopandas, and shapely (for data preprocessing only)

### Running the Visualization

1. Clone this repository or download the files
2. Open `index.html` in a web browser
   - For local development, use a local web server:
     - Python: `python -m http.server`
     - Node.js: `npx serve`
3. To run component tests, open `test.html` in a web browser

## Design Principles

### SOLID Principles Implementation

The JavaScript codebase strictly follows SOLID principles:

1. **Single Responsibility Principle (SRP)**
   - Each class has one responsibility
   - Clear separation between data loading, processing, and visualization
   - Components (NeighborhoodLayer, KNNLinkLayer, etc.) handle only their specific rendering concerns

2. **Open/Closed Principle (OCP)**
   - Code is open for extension but closed for modification
   - Configuration object makes customization possible without changing core code
   - Component architecture allows adding new visualizations without modifying existing ones

3. **Liskov Substitution Principle (LSP)**
   - Components share consistent interfaces (constructor and render method)
   - Visualization layers can be swapped or extended while maintaining the same behavior

4. **Interface Segregation Principle (ISP)**
   - Components depend only on the interfaces they need
   - No component is forced to implement methods it doesn't use

5. **Dependency Inversion Principle (DIP)**
   - High-level modules don't depend on low-level modules; both depend on abstractions
   - Configuration is injected into components rather than hard-coded
   - Components access data through a centralized reference rather than direct dependencies

### Agile Development Practices

This project follows several Agile best practices:

1. **Iterative Development**
   - Project built in distinct phases (preprocessing, map, KNN graph, styling)
   - Each component can be tested independently

2. **Continuous Testing**
   - `test.html` provides component-level tests
   - Each component can be verified independently
   - Facilitates test-driven development (TDD)

3. **Modular Design**
   - Components are decoupled for easy modification and testing
   - Clear separation of concerns

4. **Responsive to Change**
   - Configuration-driven architecture makes it easy to adapt to changing requirements
   - Centralized configuration settings

5. **Documentation**
   - Comprehensive README (this file)
   - Well-commented code with descriptive function and variable names
   - Separate test page for easy validation

## Data Processing

The preprocessing step uses Python with geopandas to:

1. Load the Chicago neighborhoods geodata
2. Load the Chicago crime data
3. Perform a spatial join to determine which neighborhood each crime belongs to
4. Save the results as GeoJSON files for web visualization

## Visualization Components

1. **NeighborhoodLayer**
   - Renders the neighborhood boundaries
   - Handles coloring based on crime counts
   - Manages hover interactions and tooltips

2. **KNNLinkLayer**
   - Draws lines between connected neighborhood centroids
   - Represents the k-nearest neighbors graph

3. **CentroidLayer**
   - Displays points at the center of each neighborhood
   - Visual representation of nodes in the graph

4. **LegendComponent**
   - Shows the color scale and corresponding crime count ranges
   - Provides context for interpreting the neighborhood colors

5. **ZoomComponent**
   - Implements pan and zoom functionality
   - Makes the visualization interactive

## Future Enhancements

Potential future improvements:

- Time-based filtering of crime data
- Additional crime statistics (types, severity, etc.)
- Alternative graph algorithms beyond k-nearest neighbors
- Comparison between different time periods
- Mobile-optimized interface

## License

This project is open source and available under the MIT License. 