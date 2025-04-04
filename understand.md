# Understanding the Chicago Crime Visualization Codebase

This document explains how our Chicago Crime Visualization works, breaking down each file and component in simple terms. By the end, you should understand how crime data is processed, how the visualization is created, and how all pieces work together.

## Table of Contents
1. [Project Overview](#project-overview)
2. [Data Processing](#data-processing)
3. [The Visualization](#the-visualization)
4. [File-by-File Breakdown](#file-by-file-breakdown)
5. [Key Concepts Explained](#key-concepts-explained)

## Project Overview

This project visualizes crime data across Chicago neighborhoods. It shows:
- A map of Chicago with neighborhoods colored based on crime count
- A network showing connections between nearby neighborhoods
- Interactive elements like tooltips and zoom/pan controls

The project follows a common pattern in data visualization:
1. **Preprocess data** using Python to assign neighborhoods to crime data
2. **Visualize data** using JavaScript and D3.js to create an interactive map
3. **Style visualization** using CSS to make it attractive and user-friendly

## Data Processing

### How We Process the Data

The first task is to determine which neighborhood each crime occurred in. This is handled by `preprocess_data.py`:

1. **Loading Data**: We read two main files:
   - `Neighborhoods_2012b_20250402.csv`: Contains Chicago neighborhood boundaries
   - `Crimes_-month february.csv`: Contains crime records with latitude/longitude

2. **Spatial Join**: We check which neighborhood polygon each crime point falls within using a "spatial join" operation.

3. **Output**: We save two GeoJSON files:
   - `neighborhoods.geojson`: Neighborhood boundaries for mapping
   - `crimes_february_with_neighborhoods.geojson`: Crime data with neighborhood information added

The Python code uses libraries like `pandas` (for data processing) and `geopandas` (for spatial operations).

## The Visualization

### How We Create the Visualization

Once we have the processed data, we create the visualization using JavaScript and D3.js:

1. **Loading Processed Data**: We load both GeoJSON files created by the Python script.

2. **Counting Crimes**: We count how many crimes occurred in each neighborhood.

3. **Creating the Color Scale**: We create a color scale (orange to red) where darker colors represent higher crime counts.

4. **Drawing the Map**: We draw each neighborhood as a polygon and color it based on crime count.

5. **Creating the KNN Graph**:
   - Calculate the center point (centroid) of each neighborhood
   - For each neighborhood, find the 5 nearest neighboring neighborhoods
   - Draw lines connecting these neighbors to create a network graph

6. **Adding Interactivity**:
   - Zoom and pan controls for the map
   - Tooltips showing neighborhood name and crime count on hover
   - Visual feedback when hovering over neighborhoods

## File-by-File Breakdown

### `preprocess_data.py`

**Purpose**: Processes raw crime data to determine which neighborhood each crime belongs to.

**Key Functions**:
- `load_neighborhoods()`: Loads and prepares neighborhood boundary data
- `load_and_process_crimes()`: Loads crime data and creates geographical points
- Spatial join operation to match crimes to neighborhoods
- Saving results as GeoJSON files for web visualization

**How it Works**:
1. Reads CSV files containing neighborhood boundaries and crime data
2. Converts neighborhood boundaries to geometric polygons
3. Converts crime locations to geometric points
4. For each crime point, checks which neighborhood polygon contains it
5. Saves the enhanced data to GeoJSON files

### `index.html`

**Purpose**: Main webpage that displays the visualization.

**Key Components**:
- Basic HTML structure
- An SVG element where D3.js will render the map
- Links to required stylesheets and scripts
- A tooltip div for displaying information on hover

**How it Works**:
- Loads D3.js library
- Links to our custom CSS and JavaScript
- Provides a container where the visualization will be drawn
- Sets up basic page structure and title

### `style.css`

**Purpose**: Controls the appearance of all visual elements.

**Key Styles**:
- Map appearance (background, borders)
- Neighborhood styling (fill colors, strokes, hover effects)
- KNN graph lines (color, thickness)
- Centroid dots (color, size)
- Tooltip formatting
- Legend styling

**How it Works**:
- Sets colors, sizes, and fonts for various elements
- Creates hover effects for interactive elements
- Ensures the visualization is visually appealing and clear

### `script.js`

**Purpose**: Contains all the logic for creating the interactive visualization.

The file uses a component-based architecture following SOLID principles. Here's how it's organized:

**Configuration Section**:
- Contains all adjustable settings in one place
- Data file paths, map dimensions, colors, etc.

**Main Visualization Controller** - `ChicagoCrimeVisualizer` class:
- Initializes the application
- Loads and processes data
- Coordinates all visualization components
- Handles error cases

**Component Classes**:
1. `NeighborhoodLayer`: Draws and colors neighborhoods
2. `KNNLinkLayer`: Creates the network of connections
3. `CentroidLayer`: Draws dots at the center of each neighborhood
4. `LegendComponent`: Creates the color legend
5. `ZoomComponent`: Adds zoom and pan functionality

**How it Works**:
1. Sets up the SVG container and main groups
2. Loads GeoJSON data files
3. Processes crime count data
4. Creates a color scale based on crime counts
5. Initializes and renders all visualization components
6. Sets up event handlers for interactivity

### `test.html`

**Purpose**: A testing page to verify that individual components work correctly.

**Key Features**:
- Separate test sections for data loading, centroid calculation, KNN algorithm, and color scale
- Interactive buttons to run each test
- Results display for each test
- Visual samples of the color scale

**How it Works**:
- Provides a simple interface for testing core functionality
- Loads the same data as the main visualization
- Runs isolated tests on specific parts of the codebase
- Helps identify and fix issues in specific components

## Key Concepts Explained

### GeoJSON Format

GeoJSON is a format for encoding geographic data structures. In our project:
- It stores neighborhood boundaries as polygons (series of coordinate points)
- It stores crime locations as points (latitude/longitude pairs)
- It includes properties like neighborhood names and crime details

### D3.js Library

D3 (Data-Driven Documents) is a JavaScript library for creating data visualizations:
- It binds data to DOM elements (like SVG shapes)
- It provides tools for mapping data values to visual properties (like colors)
- It handles transitions and animations
- It provides geographic projections for mapping coordinates to screen positions

### Geographic Projections

Projections convert geographic coordinates (latitude/longitude) to screen coordinates (x/y pixels):
- We use the Mercator projection, which works well for city-scale maps
- The projection is configured to fit Chicago properly in our visualization area

### K-Nearest Neighbors (KNN) Algorithm

The KNN algorithm finds the closest neighbors for each point:
1. Calculate the center point (centroid) of each neighborhood
2. For each centroid, calculate its distance to all other centroids
3. Sort these distances and take the k (in our case, 5) nearest ones
4. Create connections between each point and its nearest neighbors

### Color Scales

Color scales map data values to colors:
- We use a threshold scale that divides crime counts into distinct ranges
- Each range is assigned a color from light orange to dark red
- This creates a visual hierarchy showing crime density across neighborhoods

### Component-Based Architecture

Our code uses a component-based architecture:
- Each visual element is managed by a dedicated class
- Components have standardized interfaces (initialize and render methods)
- This makes the code modular, testable, and easier to maintain

### Event Handling

Interactive elements use event handlers:
- Mouse hover events show tooltips and highlight neighborhoods
- Zoom and pan events allow users to navigate the map
- These make the visualization interactive and engaging

## Code Flow

Here's the sequence of what happens when you open the visualization:

1. Browser loads `index.html`
2. HTML loads the CSS and JavaScript files
3. When DOM is ready, JavaScript creates a new `ChicagoCrimeVisualizer` instance
4. Visualizer loads the GeoJSON data files
5. Data is processed to calculate crime counts per neighborhood 
6. Color scales are created based on the crime count ranges
7. Map projection is set up to properly display Chicago
8. Neighborhood centroids are calculated
9. K-nearest neighbors are calculated for each neighborhood
10. Each component renders its part of the visualization:
    - Neighborhoods are drawn and colored
    - KNN connections are drawn between centroids
    - Centroids are drawn as small dots
    - Legend is created to explain the colors
    - Zoom behavior is attached to the map
11. The interactive visualization is now ready for user interaction 