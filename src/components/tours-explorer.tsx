'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { CalendarRange, MapPin, Users, Star, Filter, X, Compass } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ClientTourSummary {
  id: string;
  name: string;
  summary: string;
  code: string;
  startDate: string;
  endDate: string;
  clientCity: string;
  clientCountry: string;
  clientCount: number;
  clientNationalities: string[];
  durationDays: number;
  photoUrl?: string | null;
  tourTypeIds: string[];
  provinces: string[];
  guideName: string;
  guideLanguages: string[];
  itinerary: string;
  rating?: { average: number; count: number } | null;
}

interface TourTypeSummary {
  id: string;
  title: string;
  icon?: string;
}

interface ToursExplorerProps {
  tours: ClientTourSummary[];
  tourTypes: TourTypeSummary[];
}

const durationOptions = [
  { value: 'all', label: 'All durations' },
  { value: 'short', label: '1 – 4 days' },
  { value: 'medium', label: '5 – 8 days' },
  { value: 'long', label: '9+ days' },
];

function matchesDurationFilter(duration: number, filter: string) {
  if (filter === 'all') return true;
  if (filter === 'short') return duration <= 4;
  if (filter === 'medium') return duration >= 5 && duration <= 8;
  if (filter === 'long') return duration >= 9;
  return true;
}

function formatDuration(durationDays: number) {
  if (durationDays <= 1) return '1 day escape';
  if (durationDays <= 4) return `${durationDays} day boutique trip`;
  if (durationDays <= 8) return `${durationDays} day discovery`;
  return `${durationDays} day grand journey`;
}

function normaliseLocationKey(city: string, country: string) {
  return `${city}, ${country}`.trim();
}

function resolveTourTypesMap(types: TourTypeSummary[]) {
  return new Map(types.map((type) => [type.id, type]));
}

export default function ToursExplorer({ tours, tourTypes }: ToursExplorerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<string>('all');
  const [selectedDuration, setSelectedDuration] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [activeTour, setActiveTour] = useState<ClientTourSummary | null>(null);

  const tourTypeMap = useMemo(() => resolveTourTypesMap(tourTypes), [tourTypes]);

  const locationOptions = useMemo(() => {
    const options = new Set<string>();
    tours.forEach((tour) => {
      if (tour.provinces && tour.provinces.length > 0) {
        tour.provinces.forEach((province) => options.add(province));
      }
      options.add(normaliseLocationKey(tour.clientCity, tour.clientCountry));
    });
    return Array.from(options).sort();
  }, [tours]);

  const filteredTours = useMemo(() => {
    return tours
      .filter((tour) => {
        const start = new Date(tour.startDate);
        const end = new Date(tour.endDate);
        const search = searchQuery.trim().toLowerCase();
        if (
          search &&
          !tour.name.toLowerCase().includes(search) &&
          !tour.summary.toLowerCase().includes(search) &&
          !tour.code.toLowerCase().includes(search)
        ) {
          return false;
        }

        if (selectedStyle !== 'all' && !(tour.tourTypeIds ?? []).includes(selectedStyle)) {
          return false;
        }

        if (!matchesDurationFilter(tour.durationDays, selectedDuration)) {
          return false;
        }

        if (selectedLocation !== 'all') {
          const locationKey = normaliseLocationKey(tour.clientCity, tour.clientCountry);
          const matchesCity = locationKey === selectedLocation;
          const matchesProvince = tour.provinces?.some((province) => province === selectedLocation);
          if (!matchesCity && !matchesProvince) {
            return false;
          }
        }

        if (dateRange?.from && dateRange?.to) {
          const from = dateRange.from;
          const to = dateRange.to;
          if (end < from || start > to) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [tours, searchQuery, selectedStyle, selectedDuration, selectedLocation, dateRange]);

  const activeTourTypes = useMemo(() => {
    if (!activeTour) return [];
    return activeTour.tourTypeIds
      .map((id) => tourTypeMap.get(id)?.title)
      .filter((value): value is string => Boolean(value));
  }, [activeTour, tourTypeMap]);

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedStyle('all');
    setSelectedDuration('all');
    setSelectedLocation('all');
    setDateRange(undefined);
  };

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-border/60 bg-background/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-1 flex-col gap-3 md:flex-row">
            <div className="flex-1">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Search tours
              </label>
              <div className="relative">
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by name, code, or highlights"
                  className="pl-10"
                />
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
            </div>
            <div className="w-full md:w-48">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Tour style
              </label>
              <Select value={selectedStyle} onValueChange={setSelectedStyle}>
                <SelectTrigger>
                  <SelectValue placeholder="All styles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All styles</SelectItem>
                  {tourTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-40">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Duration
              </label>
              <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="All durations" />
                </SelectTrigger>
                <SelectContent>
                  {durationOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:w-[280px]">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date range
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-between">
                  {dateRange?.from && dateRange?.to
                    ? `${format(dateRange.from, 'MMM d, yyyy')} – ${format(dateRange.to, 'MMM d, yyyy')}`
                    : 'Select range'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="range" numberOfMonths={2} selected={dateRange} onSelect={setDateRange} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full md:w-48">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Location
              </label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger>
                  <SelectValue placeholder="All locations" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All locations</SelectItem>
                  {locationOptions.map((location) => (
                    <SelectItem key={location} value={location}>
                      {location}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dateRange?.from || searchQuery || selectedStyle !== 'all' || selectedDuration !== 'all' || selectedLocation !== 'all' ? (
              <Button variant="ghost" size="sm" className="mt-6 md:mt-8" onClick={resetFilters}>
                <X className="mr-2 h-4 w-4" /> Clear filters
              </Button>
            ) : null}
          </div>
          <p className="mt-4 text-sm text-muted-foreground md:mt-8">
            Showing {filteredTours.length} of {tours.length} finished tours
          </p>
        </div>
      </div>

      {filteredTours.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/60 bg-background/80 p-12 text-center text-muted-foreground">
          No tours match your filters yet. Try adjusting your search to explore more journeys.
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {filteredTours.map((tour) => {
            const start = new Date(tour.startDate);
            const end = new Date(tour.endDate);
            const rating = tour.rating;
            return (
              <Card key={tour.id} className="flex h-full flex-col overflow-hidden border-border/60 bg-background/80 shadow-md">
                <CardHeader className="p-0">
                  <div className="relative h-56 w-full">
                    {tour.photoUrl ? (
                      <Image
                        src={tour.photoUrl}
                        alt={tour.name}
                        fill
                        className="object-cover"
                        sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary/40 text-secondary-foreground/70">
                        Boutique adventure snapshot coming soon
                      </div>
                    )}
                    <Badge className="absolute left-4 top-4 bg-background/90 text-xs uppercase tracking-wide">
                      {tour.code}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-4 p-6">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="font-headline text-2xl leading-tight">{tour.name}</CardTitle>
                    <Badge variant="outline" className="shrink-0">
                      {format(start, 'MMM d')} – {format(end, 'MMM d')}
                    </Badge>
                  </div>
                  <CardDescription className="text-sm leading-relaxed text-muted-foreground">
                    {tour.summary}
                  </CardDescription>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <CalendarRange className="h-4 w-4" />
                      <span>{formatDuration(tour.durationDays)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {tour.clientCity}, {tour.clientCountry}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>
                        {tour.clientCount} travellers • Guide {tour.guideName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className={`h-4 w-4 ${rating && rating.count > 0 ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      <span>
                        {rating && rating.count > 0
                          ? `${rating.average.toFixed(1)} • ${rating.count} review${rating.count === 1 ? '' : 's'}`
                          : 'Awaiting first reviews'}
                      </span>
                    </div>
                    {tour.tourTypeIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {tour.tourTypeIds.map((id) => {
                          const type = tourTypeMap.get(id);
                          return type ? (
                            <Badge key={id} variant="secondary">
                              {type.icon ?? '✨'} {type.title}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    ) : null}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-wrap gap-3 p-6 pt-0">
                  <Button asChild className="flex-1 min-w-[150px]">
                    <Link href={`/tours/${tour.id}`}>View diary</Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1 min-w-[150px]"
                    onClick={() => setActiveTour(tour)}
                  >
                    View highlights
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(activeTour)} onOpenChange={(open) => !open && setActiveTour(null)}>
        <DialogContent className="max-w-3xl">
          {activeTour ? (
            <>
              <DialogHeader>
                <DialogTitle>{activeTour.name}</DialogTitle>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>{activeTour.summary}</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-lg bg-muted/40 p-4">
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Journey</h3>
                      <p>{format(new Date(activeTour.startDate), 'MMM d, yyyy')} – {format(new Date(activeTour.endDate), 'MMM d, yyyy')}</p>
                      <p>{formatDuration(activeTour.durationDays)}</p>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-4">
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Guide</h3>
                      <p>Lead guide {activeTour.guideName}</p>
                      {activeTour.guideLanguages.length > 0 ? (
                        <p>Languages: {activeTour.guideLanguages.join(', ')}</p>
                      ) : null}
                    </div>
                  </div>
                  {activeTour.clientNationalities.length > 0 ? (
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Traveller nationalities</h3>
                      <p>{activeTour.clientNationalities.join(', ')}</p>
                    </div>
                  ) : null}
                  {activeTour.provinces.length > 0 ? (
                    <div>
                      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Route highlights</h3>
                      <p>{activeTour.provinces.join(', ')}</p>
                    </div>
                  ) : null}
                  <div>
                    <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Itinerary snapshot</h3>
                    <p className="whitespace-pre-line leading-relaxed">{activeTour.itinerary}</p>
                  </div>
                  {activeTourTypes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {activeTourTypes.map((type) => (
                        <Badge key={type} variant="outline">
                          <Compass className="mr-1 h-3 w-3" /> {type}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setActiveTour(null)}>
                  Close
                </Button>
                <Button asChild>
                  <Link href={`/tours/${activeTour.id}`}>Open full diary</Link>
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
