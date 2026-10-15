import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { ServiceError } from './errors.js';

const token = () => randomBytes(32).toString('base64url');
const digest = value => createHash('sha256').update(value).digest('hex');
const identifier = prefix => `${prefix}_${randomUUID()}`;

export class RoomStore {
  constructor(databasePath) {
    if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true });
    this.database = new DatabaseSync(databasePath);
    this.database.exec(`
      PRAGMA journal_mode = WAL;
      PRAGMA busy_timeout = 5000;
      PRAGMA foreign_keys = ON;
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY, invite_hash TEXT NOT NULL, revision INTEGER NOT NULL, snapshot TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS members (
        room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        participant_id TEXT NOT NULL, token_hash TEXT NOT NULL,
        PRIMARY KEY (room_id, participant_id)
      );
    `);
  }

  create({ title, displayName, catalog }) {
    const inviteToken = token(), participantToken = token(), participantId = identifier('person');
    const timestamp = new Date().toISOString();
    const room = {
      id: identifier('room'), title, revision: 0, catalog,
      participants: [{ id: participantId, displayName, focusedDestinationId: null, joinedAt: timestamp }],
      dreams: [], plan: null, createdAt: timestamp, updatedAt: timestamp,
    };
    this.database.exec('BEGIN IMMEDIATE');
    try {
      this.database.prepare('INSERT INTO rooms VALUES (?, ?, ?, ?)').run(room.id, digest(inviteToken), 0, JSON.stringify(room));
      this.database.prepare('INSERT INTO members VALUES (?, ?, ?)').run(room.id, participantId, digest(participantToken));
      this.database.exec('COMMIT');
    } catch (error) { this.database.exec('ROLLBACK'); throw error; }
    return { room, inviteToken, participantId, participantToken };
  }

  authorize(roomId, inviteToken) {
    if (typeof inviteToken !== 'string' || inviteToken.length > 200) throw new ServiceError(401, 'room_unauthorized', 'A room invitation is required.');
    const record = this.database.prepare('SELECT snapshot FROM rooms WHERE id = ? AND invite_hash = ?').get(roomId, digest(inviteToken));
    if (!record) throw new ServiceError(401, 'room_unauthorized', 'The room invitation is invalid.');
    return JSON.parse(record.snapshot);
  }

  authorizeMember(roomId, participantId, participantToken) {
    if (typeof participantId !== 'string' || typeof participantToken !== 'string' || participantToken.length > 200) {
      throw new ServiceError(403, 'participant_unauthorized', 'Join this room before making changes.');
    }
    const member = this.database.prepare('SELECT participant_id FROM members WHERE room_id = ? AND participant_id = ? AND token_hash = ?')
      .get(roomId, participantId, digest(participantToken));
    if (!member) throw new ServiceError(403, 'participant_unauthorized', 'This participant credential is invalid.');
  }

  apply(roomId, inviteToken, participantToken, { expectedRevision, participantId, action }) {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const room = this.authorize(roomId, inviteToken);
      if (action.type !== 'participant.join') this.authorizeMember(roomId, participantId, participantToken);
      if (room.revision !== expectedRevision) throw new ServiceError(409, 'revision_conflict', 'The room changed. Review the latest room before retrying.', { room });
      const result = this.applyToRoom(room, participantId, action);
      room.revision += 1;
      room.updatedAt = new Date().toISOString();
      this.database.prepare('UPDATE rooms SET revision = ?, snapshot = ? WHERE id = ?').run(room.revision, JSON.stringify(room), roomId);
      if (result.participantToken) this.database.prepare('INSERT INTO members VALUES (?, ?, ?)')
        .run(roomId, result.participantId, digest(result.participantToken));
      this.database.exec('COMMIT');
      return { room, ...result };
    } catch (error) { this.database.exec('ROLLBACK'); throw error; }
  }

  applyToRoom(room, participantId, action) {
    const requirePlace = id => {
      if (!room.catalog.some(place => place.id === id)) throw new ServiceError(422, 'unknown_place', 'Choose a place from this room catalog.');
    };
    const resetAcceptance = () => { room.plan.acceptedBy = []; room.plan.status = 'proposed'; };
    const requireRequestedDestinations = stopIds => {
      if (room.dreams.some(dream => !stopIds.includes(dream.destinationId))) {
        throw new ServiceError(422, 'missing_destinations', 'Update the proposal to include every current contributed destination.');
      }
    };
    switch (action.type) {
      case 'participant.join': {
        if (room.participants.length >= 30) throw new ServiceError(422, 'room_full', 'This room supports up to 30 participants.');
        const id = identifier('person');
        room.participants.push({ id, displayName: action.displayName, focusedDestinationId: null, joinedAt: new Date().toISOString() });
        if (room.plan) room.plan.status = 'proposed';
        return { participantId: id, participantToken: token() };
      }
      case 'catalog.add': {
        if (room.catalog.length >= 200) throw new ServiceError(422, 'catalog_full', 'This room supports up to 200 places.');
        if (room.catalog.some(place => place.id === action.place.id)) throw new ServiceError(409, 'place_exists', 'That place is already in the room.');
        room.catalog.push(action.place);
        break;
      }
      case 'presence.focus':
        if (action.destinationId !== null) requirePlace(action.destinationId);
        room.participants.find(person => person.id === participantId).focusedDestinationId = action.destinationId;
        break;
      case 'dream.add':
        requirePlace(action.destinationId);
        if (room.dreams.length >= 300) throw new ServiceError(422, 'dreams_full', 'This room supports up to 300 wishes.');
        if (room.dreams.some(dream => dream.participantId === participantId && dream.destinationId === action.destinationId)) {
          throw new ServiceError(409, 'dream_exists', 'You have already added this destination.');
        }
        room.dreams.push({ id: identifier('dream'), participantId, destinationId: action.destinationId, note: action.note });
        if (room.plan) resetAcceptance();
        break;
      case 'dream.remove': {
        const dream = room.dreams.find(value => value.id === action.dreamId);
        if (!dream) throw new ServiceError(404, 'dream_missing', 'This wish no longer exists.');
        if (dream.participantId !== participantId) throw new ServiceError(403, 'dream_owner_required', 'Only its contributor can remove this wish.');
        room.dreams = room.dreams.filter(value => value.id !== action.dreamId);
        if (room.plan) resetAcceptance();
        break;
      }
      case 'plan.propose':
        action.stopIds.forEach(requirePlace);
        requireRequestedDestinations(action.stopIds);
        room.plan = { title: action.title, summary: action.summary, stopIds: action.stopIds,
          proposedBy: participantId, acceptedBy: [], status: 'proposed' };
        break;
      case 'plan.accept':
        if (!room.plan) throw new ServiceError(422, 'plan_missing', 'Propose a plan before accepting it.');
        requireRequestedDestinations(room.plan.stopIds);
        if (!room.plan.acceptedBy.includes(participantId)) room.plan.acceptedBy.push(participantId);
        room.plan.status = room.participants.every(person => room.plan.acceptedBy.includes(person.id)) ? 'accepted' : 'proposed';
        break;
      case 'plan.reorder':
        if (!room.plan) throw new ServiceError(422, 'plan_missing', 'Propose a plan before reordering it.');
        if (action.stopIds.length !== room.plan.stopIds.length || new Set(action.stopIds).size !== action.stopIds.length
          || action.stopIds.some(id => !room.plan.stopIds.includes(id))) {
          throw new ServiceError(422, 'invalid_reorder', 'Reordering must retain every existing plan stop exactly once.');
        }
        room.plan.stopIds = action.stopIds;
        resetAcceptance();
        break;
      default: throw new ServiceError(422, 'unknown_action', 'This action is unsupported.');
    }
    return {};
  }

  close() { this.database.close(); }
}
