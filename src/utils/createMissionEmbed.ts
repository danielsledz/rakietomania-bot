import { Mission } from 'src/types';

export function createMissionEmbed(mission: Mission) {
  const fields = [
    {
      name: 'Date',
      value: new Date(mission.date).toLocaleString(),
      inline: true,
    },
    { name: 'Status', value: mission.status, inline: true },
  ];

  if (mission.description) {
    fields.push({
      name: 'Description',
      value: mission.description,
      inline: true,
    });
  }

  if (mission.specifications) {
    fields.push({
      name: 'Specifications',
      value: mission.specifications,
      inline: true,
    });
  }

  if (mission.windowStart && mission.windowEnd) {
    fields.push({
      name: 'Launch Window',
      value: `${new Date(mission.windowStart).toLocaleString()} to ${new Date(
        mission.windowEnd,
      ).toLocaleString()}`,
      inline: false,
    });
  }

  if (mission.probability) {
    fields.push({
      name: 'Probability of Launch',
      value: `${mission.probability}%`,
      inline: true,
    });
  }

  if (mission.livestream) {
    fields.push({
      name: 'Livestream',
      value: mission.livestream,
      inline: true,
    });
  }

  if (mission.changeLogs && mission.changeLogs.length) {
    fields.push({
      name: 'Change Logs',
      value: mission.changeLogs.join('\n'),
      inline: true,
    });
  }

  const embed = {
    title: 'Zaarchiwizowano start: ' + mission.name,
    url: mission.livestream || undefined,
    description: mission.description,
    fields: fields,
    footer: { text: `Mission ID: ${mission._id}` },
    timestamp: new Date().toISOString(),
  };

  if (mission.patch && mission.patch.asset.url) {
    embed['image'] = { url: mission.patch.asset.url };
  }

  return { embeds: [embed] };
}
