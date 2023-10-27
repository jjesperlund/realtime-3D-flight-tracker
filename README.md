# Real Time 3D Flight Tracker

A 3D visualization that uses AirLab's Data API to fetch flight positions and directions for all currently airborne passenger aircrafts. A simplified airplane 3D model is loaded for each aircraft and the flight positions in latitude, longitude and altitude are converted into spherical coordinates and mapped onto the earth. The airplanes are locally rotated according to each airplane's direction in the API response to align the airplane 3D model with the airplanes actual direction.

## Tools

- ThreeJS
- AirLab's Data API

## Screenshots
<img src="./static/screenshots/screenshot1.png" width="800" style="border-radius:10px"/>
<img src="./static/screenshots/screenshot2.png" width="800" style="border-radius:10px" />
<img src="./static/screenshots/screenshot3.png" width="800" style="border-radius:10px" />