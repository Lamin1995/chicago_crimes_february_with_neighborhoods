# preprocess_data.py
import pandas as pd
import geopandas as gpd
from shapely import wkt
from shapely.geometry import Point
import warnings
import sys # Import sys to control exit behavior

# Suppress specific warnings
warnings.simplefilter(action='ignore', category=FutureWarning)
warnings.simplefilter(action='ignore', category=UserWarning) # Filter UserWarning for CRS assumption

# --- Configuration ---
NEIGHBORHOOD_CSV = "Neighborhoods_2012b_20250402.csv"
CRIME_CSV = "Crimes_-month february.csv"

OUTPUT_NEIGHBORHOOD_GEOJSON = "neighborhoods.geojson"
OUTPUT_CRIME_GEOJSON = "crimes_february_with_neighborhoods.geojson"

# Assumed column names - adjust based on actual file structure if errors occur
NEIGHBORHOOD_GEOM_COL = 'the_geom' # Often 'the_geom' (WKT) or 'geometry'
NEIGHBORHOOD_NAME_COL = 'PRI_NEIGH' # Primary neighborhood name
CRIME_LAT_COL = 'Latitude'
CRIME_LON_COL = 'Longitude'
TARGET_CRS = "EPSG:4326" # WGS84 for web mapping

# --- Function to load neighborhoods ---
def load_neighborhoods(filepath, geom_col, name_col, target_crs):
    print(f"Loading neighborhood data from CSV: {filepath}...")
    try:
        neighborhoods_df = pd.read_csv(filepath)
        print("CSV loaded into pandas DataFrame.")

        # Check for necessary columns
        if geom_col not in neighborhoods_df.columns:
            print(f"Error: Assumed geometry column ('{geom_col}') not found in {filepath}.")
            print("Available columns:", neighborhoods_df.columns.tolist())
            sys.exit(1)
        if name_col not in neighborhoods_df.columns:
            print(f"Error: Assumed neighborhood name column ('{name_col}') not found in {filepath}.")
            print("Available columns:", neighborhoods_df.columns.tolist())
            sys.exit(1)

        # Convert WKT geometry to Shapely geometries
        print(f"Converting WKT geometry from column '{geom_col}'...")
        try:
            # Handle potential empty strings or None values before applying wkt.loads
            valid_wkt = neighborhoods_df[geom_col].notna() & (neighborhoods_df[geom_col] != '')
            if not valid_wkt.all():
                print(f"Warning: Found {sum(~valid_wkt)} rows with missing/empty geometry in '{geom_col}'. These rows will be dropped.")
                neighborhoods_df = neighborhoods_df[valid_wkt].copy() # Keep only valid rows

            if neighborhoods_df.empty:
                print("Error: No rows remaining after filtering for valid WKT geometry.")
                sys.exit(1)

            geometry = neighborhoods_df[geom_col].apply(wkt.loads)
            print("WKT conversion successful.")
        except Exception as e_wkt:
            print(f"Error converting WKT strings in column '{geom_col}': {e_wkt}")
            print("Please ensure this column contains valid WKT geometry.")
            sys.exit(1)

        # Create GeoDataFrame
        print("Creating GeoDataFrame...")
        neighborhoods_gdf = gpd.GeoDataFrame(neighborhoods_df, geometry=geometry)
        print("GeoDataFrame created successfully.")

        # --- CRS Handling ---
        # Now neighborhoods_gdf is guaranteed to be a GeoDataFrame
        if neighborhoods_gdf.crs is None:
            print(f"Warning: GeoDataFrame has no CRS defined. Assuming {target_crs}.")
            neighborhoods_gdf.set_crs(target_crs, inplace=True)
        elif neighborhoods_gdf.crs != target_crs:
            print(f"Converting neighborhood CRS from {neighborhoods_gdf.crs} to {target_crs}.")
            neighborhoods_gdf = neighborhoods_gdf.to_crs(target_crs)
        else:
            print(f"Neighborhood GeoDataFrame CRS is already {target_crs}.")


        # Keep only essential columns
        print(f"Selecting columns: '{name_col}' and 'geometry'.")
        # Ensure the name column still exists after potential row drops
        if name_col not in neighborhoods_gdf.columns:
             print(f"Error: Name column '{name_col}' is unexpectedly missing after processing.")
             sys.exit(1)
        neighborhoods_gdf = neighborhoods_gdf[[name_col, 'geometry']]

        print("Neighborhood data loaded and standardized.")
        return neighborhoods_gdf

    except FileNotFoundError:
        print(f"Error: Neighborhood file not found at {filepath}")
        sys.exit(1)
    except Exception as e:
        # Catch other potential errors during CSV read or processing
        print(f"An unexpected error occurred in load_neighborhoods: {e}")
        sys.exit(1)

# --- Function to load and process crime data ---
def load_and_process_crimes(filepath, lat_col, lon_col, target_crs):
    print(f"Loading crime data from {filepath}...")
    try:
        crime_df = pd.read_csv(filepath)
        # Check if assumed Lat/Lon columns exist
        if lat_col not in crime_df.columns or lon_col not in crime_df.columns:
            print(f"Error: Assumed latitude ('{lat_col}') or longitude ('{lon_col}') columns not found in {filepath}.")
            print("Available columns:", crime_df.columns.tolist())
            sys.exit(1)

        # Drop rows with missing coordinates
        original_count = len(crime_df)
        crime_df.dropna(subset=[lat_col, lon_col], inplace=True)
        dropped_count = original_count - len(crime_df)
        if dropped_count > 0:
             print(f"Dropped {dropped_count} rows with missing latitude/longitude.")

        if crime_df.empty:
            print("Error: No valid crime data points with latitude and longitude found.")
            sys.exit(1)

        # Convert to GeoDataFrame
        geometry = [Point(xy) for xy in zip(crime_df[lon_col], crime_df[lat_col])]
        crime_gdf = gpd.GeoDataFrame(crime_df, geometry=geometry, crs=target_crs) # Assume WGS84 input
        print("Crime data loaded and converted to GeoDataFrame.")
        return crime_gdf

    except FileNotFoundError:
        print(f"Error: Crime file not found at {filepath}")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading or processing crime data: {e}")
        sys.exit(1)

# --- Main Execution ---
if __name__ == "__main__":
    # 1. Load and Save Neighborhoods
    neighborhoods = load_neighborhoods(NEIGHBORHOOD_CSV, NEIGHBORHOOD_GEOM_COL, NEIGHBORHOOD_NAME_COL, TARGET_CRS)
    try:
        neighborhoods.to_file(OUTPUT_NEIGHBORHOOD_GEOJSON, driver='GeoJSON')
        print(f"Neighborhood boundaries saved to {OUTPUT_NEIGHBORHOOD_GEOJSON}")
    except Exception as e:
        print(f"Error saving neighborhood GeoJSON: {e}")
        sys.exit(1)

    # 2. Load Crimes
    crimes = load_and_process_crimes(CRIME_CSV, CRIME_LAT_COL, CRIME_LON_COL, TARGET_CRS)

    # 3. Spatial Join
    print("Performing spatial join to assign neighborhoods to crimes...")
    # Ensure consistent CRS (should be fine as both are set to TARGET_CRS)
    if crimes.crs != neighborhoods.crs:
         crimes = crimes.to_crs(neighborhoods.crs)

    # Use predicate='within' which is standard for point-in-polygon
    # Keep all crime points ('left' join), add neighborhood name if found
    try:
        crimes_with_neighborhoods = gpd.sjoin(crimes, neighborhoods, how='left', predicate='within')
    except Exception as e:
        print(f"Error during spatial join: {e}")
        sys.exit(1)

    # The join adds the neighborhood name column ('PRI_NEIGH' in this case) and an 'index_right' column
    # Keep relevant columns (Example: keep original columns + neighborhood name)
    # You might want to customize which columns from the original crime data to keep
    # For now, keep all original columns plus the neighborhood name
    crimes_with_neighborhoods.drop(columns=['index_right'], inplace=True, errors='ignore') # Drop the index column from the join


    # 4. Save Enriched Crime Data
    print(f"Saving crime data with neighborhood information to {OUTPUT_CRIME_GEOJSON}...")
    try:
        # Filter out crimes that didn't fall into any neighborhood (optional)
        # crimes_with_neighborhoods = crimes_with_neighborhoods[crimes_with_neighborhoods[NEIGHBORHOOD_NAME_COL].notna()]

        crimes_with_neighborhoods.to_file(OUTPUT_CRIME_GEOJSON, driver='GeoJSON')
        print("Preprocessing complete. Output files generated:")
        print(f"- {OUTPUT_NEIGHBORHOOD_GEOJSON}")
        print(f"- {OUTPUT_CRIME_GEOJSON}")
    except Exception as e:
        print(f"Error saving enriched crime GeoJSON: {e}")
        sys.exit(1) 