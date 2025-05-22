import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import fs from 'fs';
import path from 'path';

export async function registerRoutes(app: Express): Promise<Server> {
  // GTFS data endpoint
  app.get('/api/gtfs/agency', (req, res) => {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'agency.txt'), 'utf8');
      res.send(data);
    } catch (error) {
      console.error('Error reading agency data:', error);
      res.status(500).send('Error reading agency data');
    }
  });

  app.get('/api/gtfs/routes', (req, res) => {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'routes.txt'), 'utf8');
      res.send(data);
    } catch (error) {
      console.error('Error reading routes data:', error);
      res.status(500).send('Error reading routes data');
    }
  });

  app.get('/api/gtfs/stops', (req, res) => {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'stops.txt'), 'utf8');
      res.send(data);
    } catch (error) {
      console.error('Error reading stops data:', error);
      res.status(500).send('Error reading stops data');
    }
  });

  app.get('/api/gtfs/trips', (req, res) => {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'trips.txt'), 'utf8');
      res.send(data);
    } catch (error) {
      console.error('Error reading trips data:', error);
      res.status(500).send('Error reading trips data');
    }
  });

  app.get('/api/gtfs/stop_times', (req, res) => {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'stop_times.txt'), 'utf8');
      res.send(data);
    } catch (error) {
      console.error('Error reading stop_times data:', error);
      res.status(500).send('Error reading stop_times data');
    }
  });

  app.get('/api/gtfs/calendar_dates', (req, res) => {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'calendar_dates.txt'), 'utf8');
      res.send(data);
    } catch (error) {
      console.error('Error reading calendar_dates data:', error);
      res.status(500).send('Error reading calendar_dates data');
    }
  });

  app.get('/api/gtfs/feed_info', (req, res) => {
    try {
      const data = fs.readFileSync(path.join(process.cwd(), 'attached_assets', 'feed_info.txt'), 'utf8');
      res.send(data);
    } catch (error) {
      console.error('Error reading feed_info data:', error);
      res.status(500).send('Error reading feed_info data');
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
