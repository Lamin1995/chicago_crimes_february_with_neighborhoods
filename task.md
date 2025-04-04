
## Tasks

The tasks will focus on crime dataset processing and visualization. 



### Crime Data Process and Visualization

Go to this [website](https://iadsl.github.io/vista/data/) to get access to the dataset, all the following tasks will be based on **Chicago Crime Data**. This dataset contains information on wards and communities, which are two different ways to divide the map of Chicago city. There is a third way called neighborhood to divide the city map. You can find the related information about wards, communities, and neighborhoods [here](https://www.chicago.gov/city/en/depts/2fm/supp_info/citywide_maps.html).

Our dataset contains the ID for ward and community but does not contain the information for neighborhoods. This information can be derived from the longitude and latitude of the crime data point. **Your first task is to use the information I provided above to derive the neighborhood ID for each crime data point.** You do not need to use the full dataset and can select a subset (e.g. data points for a month or a year) to demonstrate how to do this and other tasks.

After creating the neighborhood ID, **the second task is to create a visualization**, create a map visualization of the neighborhoods, and use color to encode the number of crime incidents in each neighborhood. You can do this using any library or framework. However, I recommend using D3 if you do not have a preference.

**The third task is to create a graph from the neighborhoods.** For each neighborhood, find a centroid of gravity using the geometry information. Then, create a graph of k-nearest neighbors with k = 5, i.e., the two neighborhoods are connected in the graph if they are each other's first 5 nearest neighbors. Draw this graph layout over the visualization you created in step two. When calculating the centroid and nearest neighbors, you can project longitude and latitude to a Cartesian coordinate system using any approach.

**The last task is to serve the visualization results on the Github Page**, if you are using other programming languages or libraries, you should also provide an easy way to demonstrate it.


