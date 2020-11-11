import { path } from 'd3-path';
import { ScaleLinear, scaleLinear } from 'd3-scale';
import { clamp, sum } from 'ramda';
import React, { ChangeEvent } from 'react';

import { TextField } from '@material-ui/core';
import { StatName } from '@smogon/calc';

import { BLUE, RED } from '../styles';
import { polarToCartesian, STAT_LABEL } from '../util/misc';
import TriangleSlider from './TriangleSlider';

export type Stats = { [stat in StatName]: number };

type Props = {
  boosts: Stats;
  onBoostsChange: (boosts: Stats) => void;
  natureFavoredStat: StatName;
  natureUnfavoredStat: StatName;
  onStatsChange: (stats: Stats) => void;
  realStats: Stats;
  statKey: 'ivs' | 'evs';
  stats: Stats;
};

const SIZE = 120;
export const INPUT_SIZE = 55;
export const RADIUS = SIZE / 2;

const MAX_IV = 31;
const MAX_EV = 252;
const MAX_TOTAL_EVS = 508;

/**
 * Takes a set of pokemon stats and a d3-friendly  scale and returns a set of
 * scaled data points ready to be drawn.
 *
 * @param stats An object containing Pokemon stat values (probably IVs or EVs)
 * @param scale A scale function (e.g. a function of the form f(x) = y where x and y are both real numbers)
 * @returns a list of scaled data points ready to be consumed by a visualization.
 */
const dataFromStats = (stats: Stats, scale: ScaleLinear<number, number>) => {
  return [stats.hp, stats.atk, stats.def, stats.spe, stats.spd, stats.spa].map(scale);
};

/**
 * Draws a list of numeric values (six values are expected, but this is not
 * enforced) as a radial histogram.
 *
 * @param data A list of numbers to be plotted.
 * @returns An SVG path string which is suitable for use in a <path> element.
 */
const drawHexagon = ([first, ...rest]: number[]) => {
  const hexagonPath = path();
  const [x, y] = polarToCartesian([first, 0]);
  hexagonPath.moveTo(x, y);
  rest.forEach((radius, i) => {
    const [x, y] = polarToCartesian([radius, 2 * Math.PI * ((i + 1) / 6)]);
    hexagonPath.lineTo(x, y);
  });
  hexagonPath.closePath();

  return hexagonPath.toString();
};

const StatHexagon = ({
  boosts,
  onBoostsChange,
  natureFavoredStat,
  natureUnfavoredStat,
  onStatsChange,
  realStats,
  statKey,
  stats,
}: Props) => {
  const statMax = statKey === 'ivs' ? MAX_IV : MAX_EV;

  const handleStatChange = (key: StatName) => (event: ChangeEvent<HTMLInputElement>) => {
    const numericValue = parseInt(event.target.value || '0');
    const newValue = clamp(0, statMax, numericValue);

    onStatsChange({ ...stats, [key]: newValue });
  };

  const handleBoostChange = (key: StatName) => (value: number) =>
    onBoostsChange({ ...boosts, [key]: value });

  const statScale = scaleLinear().domain([0, statMax]).range([10, RADIUS]);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        flexGrow: 1,
        justifyContent: 'center',
        padding: `${INPUT_SIZE * (3 / 2)}px 0`,
      }}
    >
      {/* HEXAGON VISUALIZATION */}
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
        <g transform={`translate(${RADIUS} ${RADIUS})`}>
          <path
            d={drawHexagon([RADIUS, RADIUS, RADIUS, RADIUS, RADIUS, RADIUS])}
            fill="white"
            stroke={BLUE}
          />
          <path
            d={drawHexagon(dataFromStats(stats, statScale))}
            fill={
              sum(Object.values(stats)) === MAX_TOTAL_EVS
                ? 'powderBlue'
                : sum(Object.values(stats)) < MAX_TOTAL_EVS
                ? 'gold'
                : 'red'
            }
          />
        </g>
      </svg>

      {/* EV/IV INPUTS */}
      {(['hp', 'atk', 'def', 'spe', 'spd', 'spa'] as StatName[]).map((key, i) => {
        const [x, y] = polarToCartesian([RADIUS + INPUT_SIZE * (4 / 5), 2 * Math.PI * (i / 6)]);

        const boostStage = boosts[key];
        const boostMultiplier = boostStage >= 0 ? (2 + boostStage) / 2 : 2 / (2 - boostStage);

        return (
          <div
            key={key}
            style={{
              position: 'absolute',
              textAlign: 'center',
              transform: `translate(${x}px, ${y}px)`,
            }}
          >
            {key !== 'hp' && (
              <div
                style={{
                  position: 'absolute',
                  top: '50%',
                  ...(['atk', 'def'].includes(key)
                    ? {
                        right: 0,
                        transform: `translate(100%, -50%)`,
                      }
                    : {
                        left: 0,
                        transform: `translate(-100%, -50%)`,
                      }),
                }}
              >
                <TriangleSlider value={boosts[key]} onChange={handleBoostChange(key)} />
              </div>
            )}
            <TextField
              size="small"
              label={STAT_LABEL[key]}
              onChange={handleStatChange(key)}
              onFocus={(e) => e.currentTarget.select()}
              style={{ maxWidth: INPUT_SIZE }}
              value={stats[key].toString()}
              type="number"
              inputProps={{ step: statKey === 'evs' ? 4 : 1 }}
            />
            <p
              style={{
                color:
                  key === natureFavoredStat && key === natureUnfavoredStat
                    ? 'inherit'
                    : key === natureFavoredStat
                    ? RED
                    : key === natureUnfavoredStat
                    ? BLUE
                    : 'inherit',
                margin: '4px 0 0',
                fontWeight: boostMultiplier !== 1 ? 'bold' : 'normal',
              }}
            >
              {Math.floor(realStats[key] * boostMultiplier)}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default StatHexagon;
