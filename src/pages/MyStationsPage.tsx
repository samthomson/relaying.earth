import { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useStationLists, useCreateOrUpdateStationList, useDeleteStationList } from '@/hooks/useStationLists';
import { useWeatherStations } from '@/hooks/useWeatherStations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { LoginArea } from '@/components/auth/LoginArea';
import { Footer } from '@/components/Footer';
import { Plus, Trash2, Edit, ArrowLeft, MapPin } from 'lucide-react';
import { nip19 } from 'nostr-tools';
import { getSensorName } from '@/lib/weatherUtils';
import { useToast } from '@/hooks/useToast';

const MyStationsPage = () => {
  useSeoMeta({
    title: 'My Stations - Nostr Weather',
    description: 'Manage your weather station lists and favorites.',
  });

  const { user } = useCurrentUser();
  const { data: lists, isLoading: listsLoading } = useStationLists(user?.pubkey);
  const { data: allStations } = useWeatherStations();
  const createOrUpdateList = useCreateOrUpdateStationList();
  const deleteList = useDeleteStationList();
  const { toast } = useToast();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    identifier: '',
    title: '',
    description: '',
    stations: [] as string[],
  });

  const handleCreateOrUpdate = async () => {
    if (!formData.identifier || !formData.title) {
      toast({
        title: 'Error',
        description: 'Please provide an identifier and title.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await createOrUpdateList.mutateAsync(formData);
      toast({
        title: 'Success',
        description: editingList ? 'List updated successfully!' : 'List created successfully!',
      });
      setCreateDialogOpen(false);
      setEditingList(null);
      setFormData({ identifier: '', title: '', description: '', stations: [] });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to save list. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (identifier: string) => {
    if (!confirm('Are you sure you want to delete this list?')) return;

    try {
      await deleteList.mutateAsync(identifier);
      toast({
        title: 'Success',
        description: 'List deleted successfully!',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to delete list. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (list: NonNullable<typeof lists>[0]) => {
    setFormData({
      identifier: list.identifier,
      title: list.title || '',
      description: list.description || '',
      stations: list.stations,
    });
    setEditingList(list.identifier);
    setCreateDialogOpen(true);
  };

  const handleAddStation = (stationPubkey: string) => {
    if (formData.stations.includes(stationPubkey)) {
      setFormData({
        ...formData,
        stations: formData.stations.filter((p) => p !== stationPubkey),
      });
    } else {
      setFormData({
        ...formData,
        stations: [...formData.stations, stationPubkey],
      });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">My Stations</h1>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-12">
          <Card className="max-w-md mx-auto">
            <CardContent className="py-12 px-8 text-center space-y-4">
              <p className="text-muted-foreground">
                Please log in to manage your weather station lists.
              </p>
              <LoginArea className="max-w-60 mx-auto" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold">My Stations</h1>
                <p className="text-sm text-muted-foreground">
                  {listsLoading ? 'Loading...' : `${lists?.length || 0} lists`}
                </p>
              </div>
            </div>
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingList(null);
                  setFormData({ identifier: '', title: '', description: '', stations: [] });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create List
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingList ? 'Edit List' : 'Create New List'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Identifier</label>
                    <Input
                      placeholder="my-home-stations"
                      value={formData.identifier}
                      onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                      disabled={!!editingList}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      A unique slug for this list (lowercase, hyphens allowed)
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Title</label>
                    <Input
                      placeholder="My Home Stations"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      placeholder="Weather stations I've deployed around my property"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Stations</label>
                    <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                      {allStations?.map((station) => {
                        const isSelected = formData.stations.includes(station.pubkey);
                        return (
                          <div
                            key={station.pubkey}
                            onClick={() => handleAddStation(station.pubkey)}
                            className={`p-3 border rounded cursor-pointer transition-colors ${
                              isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{station.name || 'Unnamed Station'}</div>
                                {station.geohash && (
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {station.geohash}
                                  </div>
                                )}
                              </div>
                              {isSelected && <Badge>Selected</Badge>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formData.stations.length} station(s) selected
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateOrUpdate} disabled={createOrUpdateList.isPending}>
                    {createOrUpdateList.isPending ? 'Saving...' : 'Save'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {listsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-full mt-2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : lists && lists.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lists.map((list) => (
              <Card key={list.identifier}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{list.title || list.identifier}</CardTitle>
                      {list.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {list.description}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(list)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(list.identifier)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground">
                    {list.stations.length} station(s)
                  </div>
                  <div className="mt-3 space-y-2">
                    {list.stations.slice(0, 3).map((stationPubkey) => {
                      const station = allStations?.find((s) => s.pubkey === stationPubkey);
                      const npub = nip19.npubEncode(stationPubkey);
                      return station ? (
                        <Link key={stationPubkey} to={`/${npub}`}>
                          <div className="text-xs p-2 border rounded hover:bg-muted transition-colors">
                            <div className="font-medium">{station.name || 'Unnamed Station'}</div>
                            <div className="text-muted-foreground flex gap-1 flex-wrap mt-1">
                              {station.sensors.slice(0, 2).map((sensor, idx) => (
                                <span key={idx}>{getSensorName(sensor.type)}</span>
                              ))}
                            </div>
                          </div>
                        </Link>
                      ) : null;
                    })}
                    {list.stations.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        +{list.stations.length - 3} more
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-12 px-8 text-center">
              <p className="text-muted-foreground mb-4">
                You haven't created any station lists yet.
              </p>
              <Button onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First List
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default MyStationsPage;
